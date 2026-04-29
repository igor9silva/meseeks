import { existsSync, mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import type { WindowState } from "../types";

export const APP_NAME = "Local Workbench";
export const APP_IDENTIFIER = "dev.localworkbench.app";
export const APP_SUPPORT_DIR = "LocalWorkbench";
export const RECENT_ITEMS_LIMIT = 12;
export const DEFAULT_WINDOW_STATE: WindowState = {
	x: 72,
	y: 48,
	width: 1440,
	height: 900,
	maximized: false,
	fullscreen: false,
};

export type AppPaths = {
	runtimeAppRoot: string;
	supportDir: string;
	logsDir: string;
	logFile: string;
	stateFile: string;
	codeServerRoot: string;
	codeServerUserDataDir: string;
	codeServerExtensionsDir: string;
	codeServerConfigDir: string;
	codeServerConfigFile: string;
	codeServerLaunchFile: string;
	codeServerSessionSocket: string;
};

const getRuntimeBunDir = (): string =>
	fileURLToPath(new URL(".", import.meta.url));

const getRuntimeAppRoot = (): string => resolve(getRuntimeBunDir(), "..");

export const isDevMode = (): boolean => {
	const runtimeAppRoot = getRuntimeAppRoot();

	return (
		process.env.ELECTROBUN_BUILD_ENV === "dev" ||
		process.execPath.includes("-dev.app") ||
		process.argv0.includes("-dev.app") ||
		process.execPath.includes("/build/dev-") ||
		runtimeAppRoot.includes("/build/dev-") ||
		runtimeAppRoot.includes("-dev.app/")
	);
};

export const createAppPaths = (): AppPaths => {
	const runtimeAppRoot = getRuntimeAppRoot();
	const supportDir = join(
		homedir(),
		"Library",
		"Application Support",
		APP_SUPPORT_DIR,
	);
	const codeServerRoot = join(supportDir, "code-server");
	const logsDir = join(supportDir, "logs");

	return {
		runtimeAppRoot,
		supportDir,
		logsDir,
		logFile: join(logsDir, "shell.log"),
		stateFile: join(supportDir, "state.json"),
		codeServerRoot,
		codeServerUserDataDir: join(codeServerRoot, "user-data"),
		codeServerExtensionsDir: join(codeServerRoot, "extensions"),
		codeServerConfigDir: join(codeServerRoot, "config"),
		codeServerConfigFile: join(codeServerRoot, "config", "config.yaml"),
		codeServerLaunchFile: join(codeServerRoot, "config", "launch.json"),
		codeServerSessionSocket: join(codeServerRoot, "run", "code-server.sock"),
	};
};

export const ensureAppDirectories = (paths: AppPaths): void => {
	const directories = [
		paths.supportDir,
		paths.logsDir,
		paths.codeServerRoot,
		paths.codeServerUserDataDir,
		paths.codeServerExtensionsDir,
		paths.codeServerConfigDir,
		dirname(paths.codeServerSessionSocket),
	];

	for (const directory of directories) {
		mkdirSync(directory, { recursive: true });
	}
};

export const getDefaultDevWorkspace = (): string | null => {
	if (!isDevMode()) {
		return null;
	}

	const runtimeAppRoot = getRuntimeAppRoot();
	const buildMarker = `${sep}build${sep}dev-`;
	const buildMarkerIndex = runtimeAppRoot.indexOf(buildMarker);

	if (buildMarkerIndex === -1) {
		return null;
	}

	const macosAppRoot = runtimeAppRoot.slice(0, buildMarkerIndex);
	const candidate = resolve(macosAppRoot, "..");
	if (!existsSync(candidate)) {
		return null;
	}

	try {
		return statSync(candidate).isDirectory() ? candidate : null;
	} catch {
		return null;
	}
};
