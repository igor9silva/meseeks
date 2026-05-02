#!/usr/bin/env bun
/**
 * Config & Task Watcher
 *
 * Watches source files for changes and regenerates outputs automatically.
 *
 * Usage:
 *   bun run .config/watch-config.ts
 */

import { watch, existsSync, readdirSync } from 'node:fs';
import type { Dirent, FSWatcher } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const PROJECT_ROOT = resolve(__dirname, '..');
const CONFIG_FILE = resolve(__dirname, './mcp.config.ts');
const RULES_FILE = resolve(__dirname, './MasterPlan.md');
const SKILLS_DIR = resolve(__dirname, './skills');
const CONFIG_GENERATOR = resolve(__dirname, './generate-configs.ts');
const TASK_GENERATOR = resolve(__dirname, './generate-task-index.ts');

const TASK_ROOTS = [
	{ label: 'public', root: join(PROJECT_ROOT, 'tasks') },
	{ label: 'private', root: join(PROJECT_ROOT, 'private', 'tasks') },
];

const TASK_EXTENSIONS = new Set(['.md', '.mdx', '.txt', '']);

// ── regeneration runners ────────────────────────────────────────────

function createRunner(label: string, script: string) {
	//
	let isRunning = false;
	let hasQueued = false;
	let debounceTimer: NodeJS.Timeout | null = null;

	function run() {
		//
		if (isRunning) {
			hasQueued = true;
			return;
		}

		isRunning = true;
		const start = Date.now();
		const proc = spawn('bun', ['run', script], { stdio: 'inherit', shell: false });

		proc.on('close', (code) => {
			isRunning = false;
			const duration = Date.now() - start;

			if (code !== 0) {
				console.error(`✗ ${label} failed (${code}) in ${duration}ms`);
			}

			if (!hasQueued) return;
			hasQueued = false;
			run();
		});
	}

	return function request() {
		//
		if (debounceTimer !== null) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debounceTimer = null;
			run();
		}, 120);
	};
}

const regenerateConfigs = createRunner('configs', CONFIG_GENERATOR);
const regenerateTasks = createRunner('tasks', TASK_GENERATOR);

// ── config watching ─────────────────────────────────────────────────

regenerateConfigs();

watch(CONFIG_FILE, (eventType) => {
	if (eventType === 'change') regenerateConfigs();
});

watch(RULES_FILE, (eventType) => {
	if (eventType === 'change') regenerateConfigs();
});

if (existsSync(SKILLS_DIR)) {
	watch(SKILLS_DIR, { recursive: true }, (eventType) => {
		if (eventType === 'change' || eventType === 'rename') regenerateConfigs();
	});
}

// ── task watching ───────────────────────────────────────────────────

regenerateTasks();

function isTaskFile(fileName: string): boolean {
	//
	const segments = fileName.split(/[\\/]/);
	if (segments.some((s) => s.startsWith('.'))) return false;

	const baseName = segments[segments.length - 1];
	const ext = extname(baseName).toLowerCase();

	if (!TASK_EXTENSIONS.has(ext)) return false;
	if (ext.length > 0) return true;
	return !baseName.includes('.');
}

const taskWatchersByDirectory = new Map<string, FSWatcher>();

function isVisiblePath(fileName: string): boolean {
	//
	const segments = fileName.split(/[\\/]/);

	return segments.every((segment) => !segment.startsWith('.'));
}

function handleTaskWatchEvent(root: string, fileName: string | null): void {
	//
	if (typeof fileName === 'string') {
		if (!isVisiblePath(fileName)) return;
		if (!isTaskFile(fileName)) return;
	}

	watchExistingTaskDirectories(root);
	regenerateTasks();
}

function watchTaskDirectory(root: string, directoryPath: string): boolean {
	//
	if (taskWatchersByDirectory.has(directoryPath)) return false;

	function trackWatcher(watcher: FSWatcher): void {
		//
		taskWatchersByDirectory.set(directoryPath, watcher);
		watcher.on('close', () => {
			taskWatchersByDirectory.delete(directoryPath);
		});
		watcher.on('error', () => {
			taskWatchersByDirectory.delete(directoryPath);
		});
	}

	try {
		const watcher = watch(directoryPath, (_eventType, fileName) => {
			handleTaskWatchEvent(root, fileName);
		});
		trackWatcher(watcher);
	} catch {
		taskWatchersByDirectory.delete(directoryPath);
		return false;
	}

	return true;
}

function watchExistingTaskDirectories(root: string): number {
	//
	let watchedCount = 0;
	const pendingDirectories = [root];

	for (let index = 0; index < pendingDirectories.length; index += 1) {
		const directoryPath = pendingDirectories[index];

		if (watchTaskDirectory(root, directoryPath)) watchedCount++;

		let entries: Dirent[];

		try {
			entries = readdirSync(directoryPath, { withFileTypes: true });
		} catch {
			continue;
		}

		for (const entry of entries) {
			if (entry.name.startsWith('.')) continue;
			if (!entry.isDirectory()) continue;
			pendingDirectories.push(join(directoryPath, entry.name));
		}
	}

	return watchedCount;
}

let watchedTaskRoots = 0;
let watchedInitialTaskDirectories = 0;

for (const source of TASK_ROOTS) {
	if (!existsSync(source.root)) continue;

	watchedTaskRoots++;
	watchedInitialTaskDirectories += watchExistingTaskDirectories(source.root);
}

console.info(
	`watching configs, skills, ${watchedTaskRoots} task roots, and ${watchedInitialTaskDirectories} task directories`,
);
