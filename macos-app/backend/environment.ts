import { spawn } from "node:child_process";
import process from "node:process";

import type { Logger } from "../src/services/logger";
import type { CapturedEnvironment, EnvironmentProbe } from "../src/types";

const CAPTURE_TIMEOUT_MS = 8000;

export const captureDeveloperEnvironment = async (
	logger: Logger,
): Promise<CapturedEnvironment> => {
	const shell = process.env.SHELL || "/bin/zsh";
	const marker = `__LOCAL_WORKBENCH_ENV_${Math.random()
		.toString(16)
		.slice(2)}__`;
	const command = [
		`printf '${marker}\\n'`,
		"node -p 'JSON.stringify(process.env)'",
		`printf '\\n${marker}\\n'`,
	].join("; ");

	logger.info("shell-env.capture.start", { shell });

	try {
		const stdout = await collectOutput(shell, ["-ilc", command], {
			...process.env,
			CI: "1",
			TERM: "dumb",
		});
		const json = extractBetweenMarkers(stdout, marker);
		const capturedEnv = JSON.parse(json) as NodeJS.ProcessEnv;
		const probes = await probeDeveloperTools(capturedEnv);

		logger.info("shell-env.capture.ready", {
			shell,
			pathHead: (capturedEnv.PATH || "").split(":").slice(0, 8),
			homebrewOnPath:
				(capturedEnv.PATH || "").includes("/opt/homebrew/bin") ||
				(capturedEnv.PATH || "").includes("/usr/local/bin"),
			nvmDir: capturedEnv.NVM_DIR || null,
			asdfDir: capturedEnv.ASDF_DIR || null,
			probes,
		});

		return {
			env: capturedEnv,
			shell,
			probes,
		};
	} catch (error) {
		logger.warn("shell-env.capture.failed", {
			shell,
			error: error instanceof Error ? error.message : String(error),
		});

		return {
			env: { ...process.env },
			shell,
			probes: [],
		};
	}
};

const extractBetweenMarkers = (output: string, marker: string): string => {
	const parts = output.split(marker);
	if (parts.length < 3) {
		throw new Error("Failed to parse login-shell environment output.");
	}

	return parts[1]!.trim();
};

const collectOutput = (
	command: string,
	args: string[],
	env: NodeJS.ProcessEnv,
): Promise<string> =>
	new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			env,
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";
		let timedOut = false;

		const timeout = setTimeout(() => {
			timedOut = true;
			child.kill("SIGKILL");
		}, CAPTURE_TIMEOUT_MS);

		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk: string) => {
			stderr += chunk;
		});

		child.once("error", (error) => {
			clearTimeout(timeout);
			reject(error);
		});

		child.once("exit", (code) => {
			clearTimeout(timeout);
			if (timedOut) {
				reject(new Error("Login-shell environment capture timed out."));
				return;
			}

			if (code !== 0) {
				reject(
					new Error(
						`Login-shell environment capture exited with code ${code}. ${stderr.trim()}`,
					),
				);
				return;
			}

			resolve(stdout);
		});
	});

const probeDeveloperTools = async (
	env: NodeJS.ProcessEnv,
): Promise<EnvironmentProbe[]> =>
	Promise.all(
		["brew", "node", "git", "bun"].map(async (command) => ({
			command,
			resolvedPath: await resolveCommand(command, env),
		})),
	);

const resolveCommand = (
	command: string,
	env: NodeJS.ProcessEnv,
): Promise<string | null> =>
	new Promise((resolve) => {
		const child = spawn("/usr/bin/which", [command], {
			env,
			stdio: ["ignore", "pipe", "ignore"],
		});

		let output = "";
		const timeout = setTimeout(() => {
			child.kill("SIGKILL");
			resolve(null);
		}, 1500);

		child.stdout.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => {
			output += chunk;
		});

		child.once("error", () => {
			clearTimeout(timeout);
			resolve(null);
		});

		child.once("exit", (code) => {
			clearTimeout(timeout);
			resolve(code === 0 ? output.trim() || null : null);
		});
	});
