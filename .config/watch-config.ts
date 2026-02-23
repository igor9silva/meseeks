#!/usr/bin/env bun
/**
 * Config & Task Watcher
 *
 * Watches source files for changes and regenerates outputs automatically.
 *
 * Usage:
 *   bun run .config/watch-config.ts
 */

import { watch, existsSync } from 'node:fs';
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
	{ label: 'private', root: join(PROJECT_ROOT, 'data', 'tasks') },
];

const TASK_BUCKETS = ['active', 'backlog', 'completed'];
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

let watchedBuckets = 0;

for (const source of TASK_ROOTS) {
	for (const bucket of TASK_BUCKETS) {
		const dir = join(source.root, bucket);
		if (!existsSync(dir)) continue;

		watchedBuckets++;

		watch(dir, { recursive: true }, (_eventType, fileName) => {
			if (typeof fileName !== 'string') return;
			if (!isTaskFile(fileName)) return;
			regenerateTasks();
		});
	}
}

console.info(`watching configs, skills, and ${watchedBuckets} task buckets`);
