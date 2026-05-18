import type { TaskDetailTask } from '../taskExplorerTypes';

export function getTaskPathFilename(taskPath: string): string {
	//
	if (taskPath.length === 0) return 'root';
	return taskPath.split('/').at(-1) ?? 'root';
}

export function getDirectoryPath(filePath: string | null): string | null {
	//
	if (!filePath) return null;

	const normalizedPath = filePath.replaceAll('\\', '/');
	const lastSeparatorIndex = normalizedPath.lastIndexOf('/');
	if (lastSeparatorIndex <= 0) return null;

	return normalizedPath.slice(0, lastSeparatorIndex);
}

export function isStructuralTask(task: TaskDetailTask): boolean {
	//
	if (task.taskPath.length === 0) return true;
	if (task.pathSegments.length !== 1) return false;

	const segment = task.pathSegments[0];
	return segment === 'inbox' || segment === 'tasks' || segment === 'references' || segment === 'ideas';
}

export function getPrivateBlurClassName(shouldBlur: boolean): string {
	//
	return shouldBlur ? 'select-none blur-xs' : '';
}

export function formatTaskTimestamp(value: string): string {
	//
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return value;

	return date.toLocaleString(undefined, {
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		month: 'short',
		year: 'numeric',
	});
}

export function getTagClassName(tag: string): string {
	//
	const colorIndex = Array.from(tag).reduce((total, char) => total + char.charCodeAt(0), 0) % 6;

	if (colorIndex === 0) return 'bg-sky-400/15 text-sky-100';
	if (colorIndex === 1) return 'bg-emerald-400/15 text-emerald-100';
	if (colorIndex === 2) return 'bg-violet-400/15 text-violet-100';
	if (colorIndex === 3) return 'bg-amber-400/15 text-amber-100';
	if (colorIndex === 4) return 'bg-rose-400/15 text-rose-100';

	return 'bg-zinc-500/30 text-zinc-100';
}
