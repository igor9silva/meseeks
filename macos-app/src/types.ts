export type WorkspaceTargetKind = "folder" | "workspace" | "file";

export type WorkspaceTarget = {
	kind: WorkspaceTargetKind;
	path: string;
};

export type WindowState = {
	x: number;
	y: number;
	width: number;
	height: number;
	maximized: boolean;
	fullscreen: boolean;
};

export type PersistedState = {
	version: number;
	window: WindowState;
	recentTargets: WorkspaceTarget[];
	lastWorkspace: WorkspaceTarget | null;
};

export type BackendConnectionInfo = {
	baseUrl: string;
	healthUrl: string;
	port: number;
	sessionSocketPath: string;
};

export type EnvironmentProbe = {
	command: string;
	resolvedPath: string | null;
};

export type CapturedEnvironment = {
	env: NodeJS.ProcessEnv;
	shell: string;
	probes: EnvironmentProbe[];
};
