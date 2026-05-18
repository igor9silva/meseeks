import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, extname, join, posix } from 'node:path';
import { normalizeTaskFilenameSlug, normalizeTaskRenameFilenameSlug } from '~/lib/taskFilename';
import { findRepoRoot } from '~/server/repoRoot';
import type { TaskSummary } from '~/server/taskIndexSchemas';

export function getTaskRoot(taskSource: TaskSummary['taskSource']): string {
	//
	const projectRoot = findRepoRoot();

	if (taskSource === 'private') {
		return join(projectRoot, 'private', 'files');
	}

	return join(projectRoot, 'files');
}

export function createTaskKey(taskPath: string, taskSource: TaskSummary['taskSource']): string {
	//
	return `${taskSource}:${taskPath}`;
}

export function runTaskIndexBuild(): void {
	//
	const buildResult = spawnSync('bun', ['run', '.config/generate-task-index.ts'], {
		cwd: findRepoRoot(),
		encoding: 'utf-8',
	});

	if (buildResult.status === 0) return;

	const errorOutput = [buildResult.stdout, buildResult.stderr]
		.filter((chunk) => chunk.trim().length > 0)
		.join('\n')
		.trim();

	throw new Error(
		errorOutput.length > 0 ? `failed to rebuild task indexes\n${errorOutput}` : 'failed to rebuild task indexes',
	);
}

export function normalizeTaskFilename(filename: string, fallbackTitle: string): string {
	//
	const rawFilename = filename.trim().length > 0 ? filename : fallbackTitle;

	return normalizeTaskFilenameValue(rawFilename);
}

export function normalizeRenameTaskFilename(filename: string): string {
	//
	const normalizedFilename = normalizeTaskRenameFilenameSlug(filename);

	if (normalizedFilename.length === 0) {
		throw new Error('filename must include at least one letter or number');
	}

	return normalizedFilename;
}

export function normalizeTaskPath(path: string): string {
	//
	const normalized = path
		.trim()
		.replace(/\\/g, '/')
		.replace(/\/+/g, '/')
		.replace(/^\/+|\/+$/g, '');

	if (normalized.length === 0) return '';

	const segments = normalized.split('/');

	for (const segment of segments) {
		if (segment === '.' || segment === '..') {
			throw new Error('task path cannot contain relative segments');
		}
	}

	return segments.join('/');
}

export function createUniqueTaskPath(taskRoot: string, parentPath: string, slug: string): string {
	//
	for (let attempt = 1; attempt <= 1000; attempt += 1) {
		const candidateSlug = attempt === 1 ? slug : `${slug}-${attempt}`;
		const candidatePath = parentPath.length === 0 ? candidateSlug : posix.join(parentPath, candidateSlug);
		const absolutePath = join(taskRoot, ...candidatePath.split('/'));

		if (!existsSync(absolutePath)) return candidatePath;
	}

	throw new Error('could not find an available task filename');
}

export function createSystemTrashPath(sourceAbsolutePath: string): string {
	//
	const trashRoot = join(homedir(), '.Trash');
	const originalFilename = basename(sourceAbsolutePath);
	const extension = extname(originalFilename);
	const filenameStem = originalFilename.slice(0, originalFilename.length - extension.length);

	mkdirSync(trashRoot, { recursive: true });

	for (let attempt = 0; attempt <= 1000; attempt += 1) {
		const candidateFilename = attempt === 0 ? originalFilename : `${filenameStem}-${attempt}${extension}`;
		const candidatePath = join(trashRoot, candidateFilename);

		if (!existsSync(candidatePath)) return candidatePath;
	}

	throw new Error('could not find an available filename in system Trash');
}

export function getTaskDirectory(task: TaskSummary): string {
	//
	const taskRoot = getTaskRoot(task.taskSource);
	if (task.taskPath.length === 0) return taskRoot;
	return join(taskRoot, ...task.taskPath.split('/'));
}

export function getTaskIndexPath(task: TaskSummary): string {
	//
	return join(getTaskRoot(task.taskSource), task.relativePath);
}

function normalizeTaskFilenameValue(value: string): string {
	//
	const slug = normalizeTaskFilenameSlug(value);

	if (slug.length === 0) {
		throw new Error('filename must include at least one letter or number');
	}

	return slug;
}
