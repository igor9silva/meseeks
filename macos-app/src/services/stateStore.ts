import { existsSync, readFileSync, writeFileSync } from "node:fs";

import {
	DEFAULT_WINDOW_STATE,
	RECENT_ITEMS_LIMIT,
} from "./appPaths";
import {
	isSafeRestorableWorkspace,
	normalizeWorkspaceTarget,
} from "./workspaces";
import type { PersistedState, WindowState, WorkspaceTarget } from "../types";

const DEFAULT_STATE: PersistedState = {
	version: 1,
	window: DEFAULT_WINDOW_STATE,
	recentTargets: [],
	lastWorkspace: null,
};

export class StateStore {
	private state: PersistedState = DEFAULT_STATE;

	constructor(private readonly filePath: string) {
		this.load();
		this.pruneMissingTargets();
	}

	getSnapshot(): PersistedState {
		return this.state;
	}

	getWindowState(): WindowState {
		return this.state.window;
	}

	getRecentTargets(): WorkspaceTarget[] {
		return this.state.recentTargets;
	}

	getLastWorkspace(): WorkspaceTarget | null {
		return this.state.lastWorkspace;
	}

	setWindowState(nextWindowState: WindowState): void {
		this.state = {
			...this.state,
			window: nextWindowState,
		};
		this.save();
	}

	noteTarget(target: WorkspaceTarget): void {
		const normalized = normalizeWorkspaceTarget(target);
		const deduped = [
			normalized,
			...this.state.recentTargets.filter(
				(existing) =>
					!(
						existing.kind === normalized.kind &&
						existing.path === normalized.path
					),
			),
		].slice(0, RECENT_ITEMS_LIMIT);

		this.state = {
			...this.state,
			recentTargets: deduped,
			lastWorkspace:
				normalized.kind === "file" ? this.state.lastWorkspace : normalized,
		};
		this.save();
	}

	clearRecentTargets(): void {
		this.state = {
			...this.state,
			recentTargets: [],
		};
		this.save();
	}

	clearUnsafeLastWorkspace(): void {
		if (isSafeRestorableWorkspace(this.state.lastWorkspace)) {
			return;
		}

		this.state = {
			...this.state,
			lastWorkspace: null,
		};
		this.save();
	}

	pruneMissingTargets(): void {
		const recentTargets = this.state.recentTargets.filter((target) =>
			existsSync(target.path),
		);
		const lastWorkspace = isSafeRestorableWorkspace(this.state.lastWorkspace)
			? this.state.lastWorkspace
			: null;

		if (
			recentTargets.length === this.state.recentTargets.length &&
			lastWorkspace === this.state.lastWorkspace
		) {
			return;
		}

		this.state = {
			...this.state,
			recentTargets,
			lastWorkspace,
		};
		this.save();
	}

	private load(): void {
		if (!existsSync(this.filePath)) {
			this.state = DEFAULT_STATE;
			return;
		}

		try {
			const parsed = JSON.parse(readFileSync(this.filePath, "utf8")) as
				| Partial<PersistedState>
				| undefined;

			this.state = {
				version: 1,
				window: parsed?.window
					? {
							x:
								typeof parsed.window.x === "number"
									? parsed.window.x
									: DEFAULT_WINDOW_STATE.x,
							y:
								typeof parsed.window.y === "number"
									? parsed.window.y
									: DEFAULT_WINDOW_STATE.y,
							width:
								typeof parsed.window.width === "number"
									? parsed.window.width
									: DEFAULT_WINDOW_STATE.width,
							height:
								typeof parsed.window.height === "number"
									? parsed.window.height
									: DEFAULT_WINDOW_STATE.height,
							maximized: Boolean(parsed.window.maximized),
							fullscreen: Boolean(parsed.window.fullscreen),
						}
					: DEFAULT_WINDOW_STATE,
				recentTargets: Array.isArray(parsed?.recentTargets)
					? parsed.recentTargets
							.filter(
								(target): target is WorkspaceTarget =>
									Boolean(target) &&
									typeof target === "object" &&
									typeof target.kind === "string" &&
									typeof target.path === "string",
							)
							.map(normalizeWorkspaceTarget)
							.slice(0, RECENT_ITEMS_LIMIT)
					: [],
				lastWorkspace:
					parsed?.lastWorkspace &&
					typeof parsed.lastWorkspace === "object" &&
					typeof parsed.lastWorkspace.kind === "string" &&
					typeof parsed.lastWorkspace.path === "string"
						? normalizeWorkspaceTarget(parsed.lastWorkspace)
						: null,
			};
		} catch {
			this.state = DEFAULT_STATE;
		}
	}

	private save(): void {
		writeFileSync(
			this.filePath,
			`${JSON.stringify(this.state, null, "\t")}\n`,
			"utf8",
		);
	}
}
