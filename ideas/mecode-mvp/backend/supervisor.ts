import { spawn } from "node:child_process";
import {
	existsSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { captureDeveloperEnvironment } from "./environment";
import { waitForHealthyBackend } from "./health";
import { getFreeLocalhostPort } from "./ports";
import { openTargetViaSessionSocket } from "./sessionSocket";
import { APP_NAME, type AppPaths } from "../src/services/appPaths";
import type { Logger } from "../src/services/logger";
import type {
	BackendConnectionInfo,
	WorkspaceTarget,
} from "../src/types";

const OPENVSX_GALLERY = {
	serviceUrl: "https://open-vsx.org/vscode/gallery",
	itemUrl: "https://open-vsx.org/vscode/item",
	extensionUrlTemplate:
		"https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest",
	resourceUrlTemplate:
		"https://open-vsx.org/vscode/asset/{publisher}/{name}/{version}/Microsoft.VisualStudio.Code.WebResources/{path}",
	controlUrl: "",
	recommendationsUrl: "",
};

type ExitListener = (error: Error) => void;
type BackendChildProcess = ReturnType<typeof spawn>;
type BackendLogLevel = "debug" | "info";

type RunningSession = BackendConnectionInfo & {
	process: BackendChildProcess;
	ready: boolean;
	recentOutput: string[];
	expectedExitReason: string | null;
};

export class BackendSupervisor {
	private session: RunningSession | null = null;
	private startPromise: Promise<BackendConnectionInfo> | null = null;
	private readonly exitListeners = new Set<ExitListener>();
	private lastOutput: string[] = [];

	constructor(
		private readonly paths: AppPaths,
		private readonly logger: Logger,
		private readonly devMode: boolean,
	) {}

	onUnexpectedExit(listener: ExitListener): () => void {
		this.exitListeners.add(listener);
		return () => {
			this.exitListeners.delete(listener);
		};
	}

	getRecentOutput(): string {
		return (this.session?.recentOutput || this.lastOutput).slice(-60).join("\n");
	}

	async ensureStarted(): Promise<BackendConnectionInfo> {
		if (this.session?.ready) {
			return this.toConnectionInfo(this.session);
		}

		if (this.startPromise) {
			return this.startPromise;
		}

		this.startPromise = this.start();

		try {
			return await this.startPromise;
		} finally {
			if (!this.session?.ready) {
				this.startPromise = null;
			}
		}
	}

	async openTarget(target: WorkspaceTarget): Promise<void> {
		const connection = await this.ensureStarted();
		await openTargetViaSessionSocket(
			connection.sessionSocketPath,
			target,
			this.logger,
		);
	}

	async shutdown(reason = "app-exit"): Promise<void> {
		if (!this.session) {
			return;
		}

		const runningSession = this.session;
		runningSession.expectedExitReason = reason;
		this.session = null;
		this.startPromise = null;
		this.lastOutput = [...runningSession.recentOutput];

		this.logger.info("backend.shutdown", {
			reason,
			pid: runningSession.process.pid,
		});

		if (runningSession.process.exitCode !== null) {
			return;
		}

		runningSession.process.kill("SIGTERM");

		await new Promise<void>((resolve) => {
			const timer = setTimeout(() => {
				if (runningSession.process.exitCode === null) {
					runningSession.process.kill("SIGKILL");
				}
				resolve();
			}, 5000);

			runningSession.process.once("exit", () => {
				clearTimeout(timer);
				resolve();
			});
		});
	}

	killNow(reason = "before-quit"): void {
		if (!this.session || this.session.process.exitCode !== null) {
			return;
		}

		this.session.expectedExitReason = reason;
		this.logger.info("backend.kill-now", {
			reason,
			pid: this.session.process.pid,
		});
		this.session.process.kill("SIGTERM");
	}

	private async start(): Promise<BackendConnectionInfo> {
		const environment = await captureDeveloperEnvironment(this.logger);
		const backendLogLevel = resolveBackendLogLevel();
		const port = await getFreeLocalhostPort();
		const codeServerEntry = this.resolveCodeServerEntry();
		const baseUrl = `http://127.0.0.1:${port}`;
		const healthUrl = `${baseUrl}/healthz`;

		if (existsSync(this.paths.codeServerSessionSocket)) {
			unlinkSync(this.paths.codeServerSessionSocket);
		}

		writeFileSync(
			this.paths.codeServerConfigFile,
			buildCodeServerConfigFile({
				port,
				appName: APP_NAME,
				userDataDir: this.paths.codeServerUserDataDir,
				extensionsDir: this.paths.codeServerExtensionsDir,
				sessionSocketPath: this.paths.codeServerSessionSocket,
			}),
			"utf8",
		);

		writeFileSync(
			this.paths.codeServerLaunchFile,
			`${JSON.stringify(
				{
					appName: APP_NAME,
					auth: "none",
					baseUrl,
					healthUrl,
					bindAddress: `127.0.0.1:${port}`,
					sessionSocketPath: this.paths.codeServerSessionSocket,
					userDataDir: this.paths.codeServerUserDataDir,
					extensionsDir: this.paths.codeServerExtensionsDir,
					openVSXGallery: OPENVSX_GALLERY,
					backendLogLevel,
					capturedShell: environment.shell,
					probes: environment.probes,
				},
				null,
				"\t",
			)}\n`,
		);

		const args = [
			codeServerEntry,
			`--config=${this.paths.codeServerConfigFile}`,
			`--bind-addr=127.0.0.1:${port}`,
			"--auth=none",
			`--user-data-dir=${this.paths.codeServerUserDataDir}`,
			`--extensions-dir=${this.paths.codeServerExtensionsDir}`,
			`--session-socket=${this.paths.codeServerSessionSocket}`,
			`--app-name=${APP_NAME}`,
			"--disable-telemetry",
			"--disable-update-check",
			`--log=${backendLogLevel}`,
		];

		const child = spawn("node", args, {
			cwd: this.paths.runtimeAppRoot,
			env: {
				...process.env,
				...environment.env,
				EXTENSIONS_GALLERY: JSON.stringify(OPENVSX_GALLERY),
			},
			stdio: ["ignore", "pipe", "pipe"],
		});

		const session: RunningSession = {
			process: child,
			port,
			baseUrl,
			healthUrl,
			sessionSocketPath: this.paths.codeServerSessionSocket,
			ready: false,
			recentOutput: [],
			expectedExitReason: null,
		};

		this.session = session;
		this.logger.info("backend.spawn", {
			entry: codeServerEntry,
			port,
			logLevel: backendLogLevel,
			sessionSocketPath: session.sessionSocketPath,
			pid: child.pid,
		});

		this.captureProcessStream(child.stdout, "info", "backend.stdout", session);
		this.captureProcessStream(child.stderr, "warn", "backend.stderr", session);

		child.once("error", (error) => {
			this.logger.error("backend.spawn.error", {
				error: error.message,
			});
		});

		child.once("exit", (code, signal) => {
			const message = `code-server exited (code=${code}, signal=${signal})`;
			this.logger.warn("backend.exit", {
				code,
				signal,
				ready: session.ready,
				expected: Boolean(session.expectedExitReason),
				expectedExitReason: session.expectedExitReason,
			});

			if (this.session === session) {
				this.session = null;
				this.startPromise = null;
			}
			this.lastOutput = [...session.recentOutput];

			if (session.ready && !session.expectedExitReason) {
				const error = new Error(message);
				for (const listener of this.exitListeners) {
					listener(error);
				}
			}
		});

		try {
			await waitForHealthyBackend(healthUrl, this.logger, child);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : String(error);
			this.logger.error("backend.ready.failed", {
				error: message,
				recentOutput: session.recentOutput.slice(-20),
			});
			await this.shutdown("startup-failure");
			throw new Error(message);
		}

		session.ready = true;
		this.startPromise = null;

		this.logger.info("backend.ready", {
			port,
			baseUrl,
			healthUrl,
		});

		return this.toConnectionInfo(session);
	}

	private resolveCodeServerEntry(): string {
		const entry = join(
			this.paths.runtimeAppRoot,
			"node_modules",
			"code-server",
			"out",
			"node",
			"entry.js",
		);

		if (!existsSync(entry)) {
			throw new Error(
				`code-server is missing at ${entry}. Run "bun install" inside mecode-mvp first.`,
			);
		}

		return entry;
	}

	private toConnectionInfo(session: RunningSession): BackendConnectionInfo {
		return {
			baseUrl: session.baseUrl,
			healthUrl: session.healthUrl,
			port: session.port,
			sessionSocketPath: session.sessionSocketPath,
		};
	}

	private captureProcessStream(
		stream: NodeJS.ReadableStream,
		level: "info" | "warn",
		event: string,
		session: RunningSession,
	): void {
		let buffer = "";
		stream.setEncoding("utf8");
		stream.on("data", (chunk: string) => {
			buffer += chunk;
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed) {
					continue;
				}
				session.recentOutput.push(trimmed);
				if (session.recentOutput.length > 200) {
					session.recentOutput.shift();
				}
				this.lastOutput = [...session.recentOutput];
				this.logger[level](event, {
					line: trimmed,
				});
			}
		});
	}
}

const resolveBackendLogLevel = (): BackendLogLevel =>
	process.env.LOCAL_WORKBENCH_CODE_SERVER_LOG_LEVEL === "debug"
		? "debug"
		: "info";

const quoteYaml = (value: string): string =>
	`"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

const buildCodeServerConfigFile = (options: {
	port: number;
	appName: string;
	userDataDir: string;
	extensionsDir: string;
	sessionSocketPath: string;
}): string => `bind-addr: 127.0.0.1:${options.port}
auth: none
user-data-dir: ${quoteYaml(options.userDataDir)}
extensions-dir: ${quoteYaml(options.extensionsDir)}
session-socket: ${quoteYaml(options.sessionSocketPath)}
app-name: ${quoteYaml(options.appName)}
disable-telemetry: true
disable-update-check: true
`;
