import { existsSync, statSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";

import type { WorkspaceTarget } from "../types";

export const normalizeWorkspaceTarget = (
	target: WorkspaceTarget,
): WorkspaceTarget => ({
	kind: target.kind,
	path: resolve(target.path),
});

export const workspaceTargetFromPath = (
	inputPath: string,
): WorkspaceTarget | null => {
	const absolutePath = resolve(inputPath);

	if (!existsSync(absolutePath)) {
		return null;
	}

	const stats = statSync(absolutePath);
	if (stats.isDirectory()) {
		return {
			kind: "folder",
			path: absolutePath,
		};
	}

	return {
		kind:
			extname(absolutePath).toLowerCase() === ".code-workspace"
				? "workspace"
				: "file",
		path: absolutePath,
	};
};

export const isSafeRestorableWorkspace = (
	target: WorkspaceTarget | null,
): boolean => {
	if (!target || target.kind === "file") {
		return false;
	}

	return existsSync(target.path);
};

export const targetLabel = (target: WorkspaceTarget): string => {
	const leafName = basename(target.path);
	if (leafName) {
		return leafName;
	}

	return target.path;
};

export const targetDetail = (target: WorkspaceTarget): string => target.path;

export const dialogStartingPath = (
	target: WorkspaceTarget | null,
): string | undefined => {
	if (!target) {
		return undefined;
	}

	return target.kind === "folder" ? target.path : dirname(target.path);
};

export const workbenchUrlForTarget = (
	baseUrl: string,
	target: WorkspaceTarget | null,
): string => {
	if (!target || target.kind === "file") {
		return `${baseUrl}/`;
	}

	if (target.kind === "workspace") {
		return `${baseUrl}/?workspace=${encodeURIComponent(target.path)}`;
	}

	return `${baseUrl}/?folder=${encodeURIComponent(target.path)}`;
};
