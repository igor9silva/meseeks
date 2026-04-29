import Electrobun, {
	ApplicationMenu,
	BrowserWindow,
	type ApplicationMenuItemConfig,
	Utils,
} from "electrobun";
import { existsSync } from "node:fs";
import process from "node:process";

import { BackendSupervisor } from "../../backend/supervisor";
import {
	APP_NAME,
	createAppPaths,
	ensureAppDirectories,
	getDefaultDevWorkspace,
	isDevMode,
} from "../services/appPaths";
import { Logger } from "../services/logger";
import { StateStore } from "../services/stateStore";
import {
	dialogStartingPath,
	isSafeRestorableWorkspace,
	targetDetail,
	targetLabel,
	workspaceTargetFromPath,
	workbenchUrlForTarget,
} from "../services/workspaces";
import type {
	WorkspaceTarget,
	WindowState,
} from "../types";
import { errorScreenHtml, loadingScreenHtml } from "../ui/screens";

type ManagedWindow = {
	window: BrowserWindow;
	currentTarget: WorkspaceTarget | null;
	workbenchLoaded: boolean;
	afterDomReady: Array<() => Promise<void> | void>;
};

const devMode = isDevMode();
const paths = createAppPaths();
ensureAppDirectories(paths);
const logger = new Logger(paths.logFile, devMode);
const stateStore = new StateStore(paths.stateFile);
stateStore.clearUnsafeLastWorkspace();

const backend = new BackendSupervisor(paths, logger, devMode);
const windows = new Map<number, ManagedWindow>();
let activeWindowId: number | null = null;

logger.info("shell.start", {
	devMode,
	runtimeAppRoot: paths.runtimeAppRoot,
	supportDir: paths.supportDir,
	logFile: paths.logFile,
});

backend.onUnexpectedExit((error) => {
	logger.error("backend.unexpected-exit", {
		error: error.message,
	});
	for (const managedWindow of windows.values()) {
		showWindowError(
			managedWindow,
			"Local backend exited",
			error.message,
			buildDiagnosticDetail(error),
		);
	}
});

ApplicationMenu.on("application-menu-clicked", (event) => {
	void handleMenuAction(
		(event as { data?: { action?: string; data?: unknown } }).data || {},
	);
});

Electrobun.events.on("before-quit", () => {
	backend.killNow("before-quit");
});

process.on("uncaughtException", (error) => {
	logger.error("shell.uncaught-exception", {
		error: error.message,
		stack: error.stack || null,
	});
	for (const managedWindow of windows.values()) {
		showWindowError(
			managedWindow,
			"Shell crashed",
			error.message,
			buildDiagnosticDetail(error),
		);
	}
});

process.on("unhandledRejection", (reason) => {
	logger.error("shell.unhandled-rejection", {
		reason:
			reason instanceof Error
				? { message: reason.message, stack: reason.stack || null }
				: String(reason),
	});
});

await createWorkbenchWindow(resolveStartupTarget());
rebuildMenu();

async function createWorkbenchWindow(
	target: WorkspaceTarget | null,
): Promise<ManagedWindow> {
	const initialState = stateStore.getWindowState();
	const frame = {
		x: initialState.x,
		y: initialState.y,
		width: initialState.width,
		height: initialState.height,
	};

	const window = new BrowserWindow({
		title: APP_NAME,
		frame,
		url: null,
		html: loadingScreenHtml(
			APP_NAME,
			"Preparing your local workbench runtime.",
		),
		renderer: "native",
		titleBarStyle: "default",
		transparent: false,
		sandbox: true,
	});

	if (initialState.maximized) {
		window.maximize();
	}
	if (initialState.fullscreen) {
		window.setFullScreen(true);
	}

	const managedWindow: ManagedWindow = {
		window,
		currentTarget: target,
		workbenchLoaded: false,
		afterDomReady: [],
	};

	windows.set(window.id, managedWindow);
	activeWindowId = window.id;
	updateWindowTitle(managedWindow);
	attachWindowLifecycle(managedWindow);

	if (target) {
		stateStore.noteTarget(target);
	}

	logger.info("window.created", {
		id: window.id,
		target,
		frame,
	});

	void bootstrapWindow(managedWindow, target, null);
	rebuildMenu();

	return managedWindow;
}

function attachWindowLifecycle(managedWindow: ManagedWindow): void {
	const { window } = managedWindow;

	window.on("focus", () => {
		activeWindowId = window.id;
		rebuildMenu();
	});

	window.on("move", (event: unknown) => {
		const data = (event as { data?: Partial<WindowState> }).data;
		if (!data || window.isMaximized() || window.isFullScreen()) {
			return;
		}
		persistWindowStateFromEvent(data);
	});

	window.on("resize", (event: unknown) => {
		const data = (event as { data?: Partial<WindowState> }).data;
		if (!data || window.isMaximized() || window.isFullScreen()) {
			return;
		}
		persistWindowStateFromEvent(data);
	});

	window.on("close", () => {
		persistWindowState(window);
		windows.delete(window.id);
		if (activeWindowId === window.id) {
			activeWindowId = windows.size
				? Array.from(windows.keys())[0] || null
				: null;
		}
		rebuildMenu();
	});

	window.webview.on("dom-ready", () => {
		managedWindow.workbenchLoaded = true;
		const queue = [...managedWindow.afterDomReady];
		managedWindow.afterDomReady = [];
		for (const task of queue) {
			void Promise.resolve(task()).catch((error) => {
				logger.error("window.dom-ready.task.failed", {
					error:
						error instanceof Error ? error.message : String(error),
					windowId: window.id,
				});
			});
		}
	});
}

async function bootstrapWindow(
	managedWindow: ManagedWindow,
	navigationTarget: WorkspaceTarget | null,
	fileTarget: WorkspaceTarget | null,
): Promise<void> {
	try {
		managedWindow.workbenchLoaded = false;
		const connection = await backend.ensureStarted();

		if (fileTarget) {
			managedWindow.afterDomReady.push(async () => {
				await backend.openTarget(fileTarget);
			});
		}

		const url = workbenchUrlForTarget(connection.baseUrl, navigationTarget);
		logger.info("window.load-workbench", {
			windowId: managedWindow.window.id,
			url,
			navigationTarget,
			fileTarget,
		});
		managedWindow.window.webview.loadURL(url);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : String(error);
		showWindowError(
			managedWindow,
			"Backend startup failed",
			message,
			buildDiagnosticDetail(
				error instanceof Error ? error : new Error(message),
			),
		);
	}
}

async function openTargetInWindow(
	target: WorkspaceTarget,
	managedWindow = getActiveManagedWindow(),
): Promise<void> {
	if (!managedWindow) {
		await createWorkbenchWindow(target);
		return;
	}

	logger.info("window.open-target", {
		windowId: managedWindow.window.id,
		target,
	});

	managedWindow.currentTarget = target;
	updateWindowTitle(managedWindow);
	stateStore.noteTarget(target);
	rebuildMenu();

	if (target.kind === "folder" || target.kind === "workspace") {
		await bootstrapWindow(managedWindow, target, null);
		return;
	}

	if (!managedWindow.workbenchLoaded) {
		await bootstrapWindow(managedWindow, null, target);
		return;
	}

	try {
		await backend.openTarget(target);
	} catch (error) {
		showWindowError(
			managedWindow,
			"Opening file failed",
			error instanceof Error ? error.message : String(error),
			buildDiagnosticDetail(
				error instanceof Error
					? error
					: new Error(String(error)),
			),
		);
	}
}

async function reloadWindow(managedWindow = getActiveManagedWindow()): Promise<void> {
	if (!managedWindow) {
		return;
	}

	managedWindow.window.webview.loadHTML(
		loadingScreenHtml(APP_NAME, "Reloading the local workbench."),
	);

	if (managedWindow.currentTarget?.kind === "file") {
		await bootstrapWindow(managedWindow, null, managedWindow.currentTarget);
		return;
	}

	await bootstrapWindow(managedWindow, managedWindow.currentTarget, null);
}

function showWindowError(
	managedWindow: ManagedWindow,
	title: string,
	summary: string,
	detail: string,
): void {
	logger.error("window.error-screen", {
		windowId: managedWindow.window.id,
		title,
		summary,
	});
	managedWindow.workbenchLoaded = false;
	managedWindow.window.webview.loadHTML(
		errorScreenHtml(title, summary, detail, paths.logFile),
	);
}

function buildDiagnosticDetail(error: Error): string {
	const logTail = logger.readTail(60);
	const backendTail = backend.getRecentOutput();
	return [
		`Error: ${error.message}`,
		"",
		"Backend output:",
		backendTail || "(no backend output captured)",
		"",
		"Shell log tail:",
		logTail || "(log file empty)",
	].join("\n");
}

async function handleMenuAction(payload: {
	action?: string;
	data?: unknown;
}): Promise<void> {
	switch (payload.action) {
		case "window:new":
			await createWorkbenchWindow(
				getActiveManagedWindow()?.currentTarget || resolveStartupTarget(),
			);
			return;
		case "file:open-file":
			await openNativeSelection("file");
			return;
		case "file:open-folder":
			await openNativeSelection("folder");
			return;
		case "recent:open": {
			const target = asWorkspaceTarget(payload.data);
			if (target) {
				await openTargetInWindow(target);
			}
			return;
		}
		case "recent:clear":
			stateStore.clearRecentTargets();
			rebuildMenu();
			return;
		case "view:reload":
			await reloadWindow();
			return;
		case "view:toggle-devtools":
			getActiveManagedWindow()?.window.webview.toggleDevTools();
			return;
		case "app:quit":
			await backend.shutdown("menu-quit");
			Utils.quit();
			return;
		default:
			return;
	}
}

async function openNativeSelection(kind: "file" | "folder"): Promise<void> {
	const activeWindow = getActiveManagedWindow();
	const startingFolder =
		dialogStartingPath(activeWindow?.currentTarget || null) ||
		paths.supportDir;

	const selection = await Utils.openFileDialog({
		startingFolder,
		allowedFileTypes: "*",
		canChooseFiles: kind === "file",
		canChooseDirectory: kind === "folder",
		allowsMultipleSelection: false,
	});

	const selectedPath = selection[0];
	if (!selectedPath) {
		return;
	}

	const target = workspaceTargetFromPath(selectedPath);
	if (!target) {
		return;
	}

	await openTargetInWindow(target, activeWindow || undefined);
}

function rebuildMenu(): void {
	ApplicationMenu.setApplicationMenu(buildApplicationMenu());
}

function buildApplicationMenu(): ApplicationMenuItemConfig[] {
	const recentTargets = stateStore.getRecentTargets();
	const recentSubmenu: ApplicationMenuItemConfig[] = recentTargets.length
		? recentTargets.map((target) => ({
				label: targetLabel(target),
				tooltip: targetDetail(target),
				action: "recent:open",
				data: target,
			}))
		: [
				{
					label: "No Recent Workspaces",
					enabled: false,
				},
			];

	if (recentTargets.length) {
		recentSubmenu.push({ type: "divider" });
		recentSubmenu.push({
			label: "Clear Menu",
			action: "recent:clear",
		});
	}

	return [
		{
			label: APP_NAME,
			submenu: [
				{
					label: `Quit ${APP_NAME}`,
					action: "app:quit",
					accelerator: "CommandOrControl+Q",
				},
			],
		},
		{
			label: "File",
			submenu: [
				{
					label: "New Window",
					action: "window:new",
					accelerator: "CommandOrControl+N",
				},
				{ type: "divider" },
				{
					label: "Open File...",
					action: "file:open-file",
					accelerator: "CommandOrControl+O",
				},
				{
					label: "Open Folder...",
					action: "file:open-folder",
					accelerator: "CommandOrControl+Shift+O",
				},
				{
					label: "Open Recent",
					submenu: recentSubmenu,
				},
				{ type: "divider" },
				{
					label: "Quit",
					action: "app:quit",
					accelerator: "CommandOrControl+Q",
				},
			],
		},
		{
			label: "View",
			submenu: [
				{
					label: "Reload",
					action: "view:reload",
					accelerator: "CommandOrControl+R",
				},
				{
					label: "Toggle DevTools",
					action: "view:toggle-devtools",
					accelerator: "Alt+CommandOrControl+I",
				},
			],
		},
	];
}

function resolveStartupTarget(): WorkspaceTarget | null {
	const lastWorkspace = stateStore.getLastWorkspace();
	if (isSafeRestorableWorkspace(lastWorkspace)) {
		return lastWorkspace;
	}

	const devWorkspace = getDefaultDevWorkspace();
	if (devWorkspace && existsSync(devWorkspace)) {
		return {
			kind: "folder",
			path: devWorkspace,
		};
	}

	return null;
}

function getActiveManagedWindow(): ManagedWindow | undefined {
	if (activeWindowId !== null) {
		const active = windows.get(activeWindowId);
		if (active) {
			return active;
		}
	}

	return Array.from(windows.values())[0];
}

function persistWindowState(browserWindow: BrowserWindow): void {
	const currentSnapshot = stateStore.getWindowState();
	const frame =
		browserWindow.isMaximized() || browserWindow.isFullScreen()
			? {
					x: currentSnapshot.x,
					y: currentSnapshot.y,
					width: currentSnapshot.width,
					height: currentSnapshot.height,
				}
			: browserWindow.getFrame();

	stateStore.setWindowState({
		x: frame.x,
		y: frame.y,
		width: frame.width,
		height: frame.height,
		maximized: browserWindow.isMaximized(),
		fullscreen: browserWindow.isFullScreen(),
	});
}

function persistWindowStateFromEvent(eventData: Partial<WindowState>): void {
	const previous = stateStore.getWindowState();
	stateStore.setWindowState({
		x: typeof eventData.x === "number" ? eventData.x : previous.x,
		y: typeof eventData.y === "number" ? eventData.y : previous.y,
		width:
			typeof eventData.width === "number"
				? eventData.width
				: previous.width,
		height:
			typeof eventData.height === "number"
				? eventData.height
				: previous.height,
		maximized: previous.maximized,
		fullscreen: previous.fullscreen,
	});
}

function updateWindowTitle(managedWindow: ManagedWindow): void {
	const target = managedWindow.currentTarget;
	if (!target) {
		managedWindow.window.setTitle(APP_NAME);
		return;
	}

	managedWindow.window.setTitle(
		`${targetLabel(target)} - ${APP_NAME}`,
	);
}

function asWorkspaceTarget(value: unknown): WorkspaceTarget | null {
	if (
		!value ||
		typeof value !== "object" ||
		typeof (value as WorkspaceTarget).kind !== "string" ||
		typeof (value as WorkspaceTarget).path !== "string"
	) {
		return null;
	}

	return value as WorkspaceTarget;
}
