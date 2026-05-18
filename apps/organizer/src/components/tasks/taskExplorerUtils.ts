import type { TaskSource } from '~/lib/explorerSearchParams';
import {
	getTaskDisplayFilename,
	getTaskFileBasename,
	getTaskFilename,
	normalizeTaskFilenameSlug,
	normalizeTaskRenameFilenameSlug,
} from '~/lib/taskFilename';
import type { CreateTaskInput } from '~/server/taskExplorer';
import type { CreateTaskDefaults, TaskDetailTask } from './taskExplorerTypes';

export const taskSourceOptions: TaskSource[] = ['public', 'private'];
export const taskPriorityOptions: Array<CreateTaskInput['priority']> = ['critical', 'high', 'medium', 'low'];
export const SEARCH_DEBOUNCE_MS = 150;

export function formatSourceLabel(source: TaskSource): string {
	//
	return source === 'private' ? 'Private' : 'Public';
}

export function dedupeStrings(values: string[]): string[] {
	//
	const seen = new Set<string>();
	const output: string[] = [];

	for (const value of values) {
		const trimmedValue = value.trim();
		if (trimmedValue.length === 0) continue;
		if (seen.has(trimmedValue)) continue;
		seen.add(trimmedValue);
		output.push(trimmedValue);
	}

	return output;
}

export function getCreateTaskDefaults(): CreateTaskDefaults {
	//
	return {
		parentPath: 'inbox',
		status: null,
		taskSource: 'private',
	};
}

export function parseTaskSource(value: string): TaskSource | null {
	//
	if (value === 'public') return value;
	if (value === 'private') return value;
	return null;
}

export function parseTaskPriority(value: string): CreateTaskInput['priority'] | null {
	//
	if (value === 'critical') return value;
	if (value === 'high') return value;
	if (value === 'medium') return value;
	if (value === 'low') return value;
	return null;
}

export function parseTagDraft(value: string): string[] {
	//
	return dedupeStrings(
		value
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0),
	);
}

export function createTaskFilename(value: string): string {
	//
	return normalizeTaskFilenameSlug(value);
}

export function createTaskRenameFilename(value: string): string {
	//
	return normalizeTaskRenameFilenameSlug(value);
}

export { getTaskDisplayFilename, getTaskFileBasename, getTaskFilename };

export function getMutationErrorMessage(error: unknown, fallback: string): string {
	//
	return error instanceof Error ? error.message : fallback;
}

export function toCursorFileHref(absolutePath: string | null): string | null {
	//
	if (!absolutePath) return null;

	const url = new URL('cursor://file');
	url.pathname = absolutePath;

	return url.toString();
}

function buildTaskContextPrompt(task: TaskDetailTask, intent: string): string {
	//
	const taskFileRelativePath =
		task.taskSource === 'private' ? `private/files/${task.relativePath}` : `files/${task.relativePath}`;
	const lines = [
		intent,
		'',
		'Task context:',
		`- key: ${task.key}`,
		`- visibility: ${task.taskSource}`,
		`- path: ${task.taskSource}/${task.taskPath}`,
		`- file: ${taskFileRelativePath}`,
		`- title: ${task.title}`,
		`- status: ${task.status}`,
		`- priority: ${task.priority ?? 'none'}`,
		`- tags: ${task.tags.length > 0 ? task.tags.join(', ') : 'none'}`,
	];

	if (task.absolutePath) {
		lines.push(`- absolute path: ${task.absolutePath}`);
	}

	lines.push('', 'Body:', task.body.trim());

	return lines.join('\n');
}

export function toCursorTaskHref(task: TaskDetailTask): string {
	//
	const url = new URL('cursor://anysphere.cursor-deeplink/prompt');

	url.searchParams.set('text', buildTaskContextPrompt(task, 'Open this Meseeks task and help implement it.'));

	return url.toString();
}

export function toCodexTaskHref(task: TaskDetailTask): string {
	//
	const url = new URL('codex://new');

	url.searchParams.set('prompt', buildTaskContextPrompt(task, 'Open this Meseeks task and help implement it.'));

	return url.toString();
}

export function toCodexPlanHref(task: TaskDetailTask): string {
	//
	const url = new URL('codex://new');

	url.searchParams.set(
		'prompt',
		buildTaskContextPrompt(
			task,
			'Use the plan skill on this Meseeks task. Preserve source context, decide the right task path/tags, and avoid destructive moves unless I confirm.',
		),
	);

	return url.toString();
}

export function toCodexSeekHref(task: TaskDetailTask): string {
	//
	const url = new URL('codex://new');

	url.searchParams.set(
		'prompt',
		buildTaskContextPrompt(task, 'Use the seek skill on this Meseeks task. Seek a resolution and do the task.'),
	);

	return url.toString();
}
