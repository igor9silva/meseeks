#!/usr/bin/env bun

import { spawnSync } from 'node:child_process';
import {
	existsSync,
	readFileSync,
	renameSync,
	watch,
	writeFileSync,
} from 'node:fs';
import type { FSWatcher } from 'node:fs';
import { homedir } from 'node:os';
import {
	basename,
	dirname,
	isAbsolute,
	join,
	relative,
	resolve,
} from 'node:path';

type WorkspaceFolder = {
	name?: string;
	path: string;
};

type Worktree = {
	path: string;
};

type SyncResult = {
	added: WorkspaceFolder[];
	changed: boolean;
	removed: WorkspaceFolder[];
	total: number;
	workspacePath: string;
};

const PROJECT_ROOT = resolve(__dirname, '..');
const PROJECT_NAME = basename(PROJECT_ROOT);
const WORKSPACE_FILE = join(PROJECT_ROOT, 'meseeks.code-workspace');
const CODEX_WORKTREES_ROOT = resolve(
	process.env.CODEX_WORKTREES_DIR ?? join(homedir(), '.codex', 'worktrees'),
);
const WATCH_MODE = process.argv.includes('--watch');
const DRY_RUN = process.argv.includes('--dry-run');

function main(): void {
	//
	logResult(syncWorkspaceFile());

	if (!WATCH_MODE) return;

	const watchers: FSWatcher[] = [];
	const requestSync = createDebouncedSync();

	watchers.push(watch(WORKSPACE_FILE, requestSync));

	if (existsSync(CODEX_WORKTREES_ROOT)) {
		watchers.push(watch(CODEX_WORKTREES_ROOT, requestSync));
		console.info(`watching ${CODEX_WORKTREES_ROOT}`);
	} else {
		console.warn(`Codex worktrees directory does not exist: ${CODEX_WORKTREES_ROOT}`);
	}

	process.on('SIGINT', () => closeAndExit(watchers));
	process.on('SIGTERM', () => closeAndExit(watchers));
}

function createDebouncedSync(): () => void {
	//
	let timer: NodeJS.Timeout | null = null;
	let followUpTimer: NodeJS.Timeout | null = null;

	return () => {
		if (timer !== null) clearTimeout(timer);

		timer = setTimeout(() => {
			timer = null;
			logResult(syncWorkspaceFile());

			if (followUpTimer !== null) clearTimeout(followUpTimer);
			followUpTimer = setTimeout(() => {
				followUpTimer = null;
				logResult(syncWorkspaceFile());
			}, 1200);
		}, 180);
	};
}

function closeAndExit(watchers: FSWatcher[]): void {
	//
	for (const watcher of watchers) watcher.close();
	process.exit(0);
}

function syncWorkspaceFile(): SyncResult {
	//
	const sourceContent = readFileSync(WORKSPACE_FILE, 'utf8');
	const sourceFolders = readWorkspaceFolders(sourceContent);
	const workspaceDirectory = dirname(WORKSPACE_FILE);
	const baseFolders = sourceFolders.filter(
		(folder) => !isManagedCodexWorktreeFolder(folder, workspaceDirectory),
	);
	const baseFolderPaths = new Set(
		baseFolders.map((folder) => normalizeFolderPath(folder.path, workspaceDirectory)),
	);
	const codexFolders = listCodexWorktrees()
		.filter((worktree) => !baseFolderPaths.has(resolve(worktree.path)))
		.map(toWorkspaceFolder);
	const nextFolders = [...baseFolders, ...codexFolders];
	const nextContent = replaceWorkspaceFolders(sourceContent, nextFolders);
	const changed = sourceContent !== nextContent;

	if (changed && !DRY_RUN) {
		writeFileAtomic(WORKSPACE_FILE, nextContent);
	}

	const previousCodexFolders = sourceFolders.filter((folder) =>
		isManagedCodexWorktreeFolder(folder, workspaceDirectory),
	);
	const nextCodexFolderPaths = new Set(codexFolders.map((folder) => folder.path));
	const previousCodexFolderPaths = new Set(
		previousCodexFolders.map((folder) =>
			normalizeFolderPath(folder.path, workspaceDirectory),
		),
	);

	return {
		added: codexFolders.filter(
			(folder) => !previousCodexFolderPaths.has(folder.path),
		),
		changed,
		removed: previousCodexFolders.filter(
			(folder) =>
				!nextCodexFolderPaths.has(normalizeFolderPath(folder.path, workspaceDirectory)),
		),
		total: codexFolders.length,
		workspacePath: WORKSPACE_FILE,
	};
}

function listCodexWorktrees(): Worktree[] {
	//
	const result = spawnSync('git', ['worktree', 'list', '--porcelain'], {
		cwd: PROJECT_ROOT,
		encoding: 'utf8',
	});

	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(result.stderr || 'git worktree list failed');
	}

	return parseWorktreeList(result.stdout)
		.filter((worktree) => isCodexWorktreePath(worktree.path))
		.sort((a, b) => a.path.localeCompare(b.path));
}

function parseWorktreeList(output: string): Worktree[] {
	//
	const worktrees: Worktree[] = [];

	for (const line of output.split('\n')) {
		if (!line.startsWith('worktree ')) continue;
		worktrees.push({ path: line.slice('worktree '.length) });
	}

	return worktrees;
}

function toWorkspaceFolder(worktree: Worktree): WorkspaceFolder {
	//
	const worktreeId = basename(dirname(worktree.path));

	return {
		name: `Codex ${worktreeId}`,
		path: worktree.path,
	};
}

function readWorkspaceFolders(content: string): WorkspaceFolder[] {
	//
	const range = findFoldersArrayRange(content);
	const foldersText = content.slice(range.start, range.end);
	const json = removeTrailingCommas(stripJsonComments(foldersText));
	const folders = JSON.parse(json) as WorkspaceFolder[];

	return folders.filter((folder) => typeof folder.path === 'string');
}

function replaceWorkspaceFolders(
	content: string,
	folders: WorkspaceFolder[],
): string {
	//
	const range = findFoldersArrayRange(content);
	const serializedFolders = serializeWorkspaceFolders(folders);

	return `${content.slice(0, range.start)}${serializedFolders}${content.slice(range.end)}`;
}

function serializeWorkspaceFolders(folders: WorkspaceFolder[]): string {
	//
	const lines = ['['];

	for (const folder of folders) {
		lines.push('\t\t{');
		if (folder.name) lines.push(`\t\t\t"name": ${JSON.stringify(folder.name)},`);
		lines.push(`\t\t\t"path": ${JSON.stringify(folder.path)},`);
		lines.push('\t\t},');
	}

	lines.push('\t]');

	return lines.join('\n');
}

function findFoldersArrayRange(content: string): { end: number; start: number } {
	//
	const keyIndex = content.search(/"folders"\s*:/);

	if (keyIndex === -1) throw new Error('Workspace file is missing "folders"');

	const arrayStart = content.indexOf('[', keyIndex);

	if (arrayStart === -1) throw new Error('Workspace "folders" is not an array');

	return {
		end: findMatchingBracket(content, arrayStart) + 1,
		start: arrayStart,
	};
}

function findMatchingBracket(content: string, start: number): number {
	//
	let depth = 0;
	let inString = false;
	let inLineComment = false;
	let inBlockComment = false;
	let escaped = false;

	for (let index = start; index < content.length; index++) {
		const char = content[index];
		const next = content[index + 1];

		if (inLineComment) {
			if (char === '\n') inLineComment = false;
			continue;
		}

		if (inBlockComment) {
			if (char === '*' && next === '/') {
				inBlockComment = false;
				index++;
			}
			continue;
		}

		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (char === '\\') {
				escaped = true;
			} else if (char === '"') {
				inString = false;
			}
			continue;
		}

		if (char === '/' && next === '/') {
			inLineComment = true;
			index++;
			continue;
		}

		if (char === '/' && next === '*') {
			inBlockComment = true;
			index++;
			continue;
		}

		if (char === '"') {
			inString = true;
			continue;
		}

		if (char === '[') depth++;
		if (char === ']') {
			depth--;
			if (depth === 0) return index;
		}
	}

	throw new Error('Workspace "folders" array is not closed');
}

function stripJsonComments(content: string): string {
	//
	let result = '';
	let inString = false;
	let inLineComment = false;
	let inBlockComment = false;
	let escaped = false;

	for (let index = 0; index < content.length; index++) {
		const char = content[index];
		const next = content[index + 1];

		if (inLineComment) {
			if (char === '\n') {
				inLineComment = false;
				result += char;
			}
			continue;
		}

		if (inBlockComment) {
			if (char === '\n') result += char;
			if (char === '*' && next === '/') {
				inBlockComment = false;
				index++;
			}
			continue;
		}

		if (inString) {
			result += char;

			if (escaped) {
				escaped = false;
			} else if (char === '\\') {
				escaped = true;
			} else if (char === '"') {
				inString = false;
			}
			continue;
		}

		if (char === '/' && next === '/') {
			inLineComment = true;
			index++;
			continue;
		}

		if (char === '/' && next === '*') {
			inBlockComment = true;
			index++;
			continue;
		}

		if (char === '"') inString = true;
		result += char;
	}

	return result;
}

function removeTrailingCommas(content: string): string {
	//
	return content.replace(/,\s*([}\]])/g, '$1');
}

function isManagedCodexWorktreeFolder(
	folder: WorkspaceFolder,
	workspaceDirectory: string,
): boolean {
	//
	return (
		folder.name?.startsWith('Codex ') === true &&
		isCodexWorktreePath(normalizeFolderPath(folder.path, workspaceDirectory))
	);
}

function isCodexWorktreePath(worktreePath: string): boolean {
	//
	const relativePath = relative(CODEX_WORKTREES_ROOT, resolve(worktreePath));

	if (
		relativePath === '' ||
		relativePath.startsWith('..') ||
		isAbsolute(relativePath)
	) {
		return false;
	}

	const parts = relativePath.split(/[\\/]/);

	return parts.length === 2 && parts[1] === PROJECT_NAME;
}

function normalizeFolderPath(folderPath: string, workspaceDirectory: string): string {
	//
	return resolve(workspaceDirectory, folderPath);
}

function writeFileAtomic(filePath: string, content: string): void {
	//
	const tempPath = `${filePath}.${process.pid}.tmp`;

	writeFileSync(tempPath, content);
	renameSync(tempPath, filePath);
}

function logResult(result: SyncResult): void {
	//
	const suffix = DRY_RUN ? ' dry-run' : '';

	if (!result.changed) {
		console.info(
			`codex workspace unchanged${suffix}: ${result.total} worktree folders in ${basename(
				result.workspacePath,
			)}`,
		);
		return;
	}

	const added = result.added.map((folder) => folder.name).join(', ') || 'none';
	const removed = result.removed.map((folder) => folder.name).join(', ') || 'none';

	console.info(
		`codex workspace synced${suffix}: ${result.total} worktree folders in ${basename(
			result.workspacePath,
		)} (added: ${added}; removed: ${removed})`,
	);
}

main();
