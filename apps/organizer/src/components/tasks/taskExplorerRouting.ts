import { type ExplorerRouteSearch, type TaskSource, ROOT_PARENT_KEY } from '~/lib/explorerSearchParams';
import type { ExplorerTask } from './taskExplorerTypes';

export type ExpandedPanel = 'current' | 'subtasks' | 'selected';

export function parseRoutePath(routePath: string): { currentSource: TaskSource | null; currentPath: string } {
	//
	const normalizedPath = routePath.replace(/^\/+|\/+$/g, '');
	if (normalizedPath.length === 0) return { currentSource: null, currentPath: '' };

	const segments = normalizedPath.split('/');
	const firstSegment = segments[0];

	if (firstSegment !== 'public' && firstSegment !== 'private') {
		return { currentSource: null, currentPath: '' };
	}

	return {
		currentSource: firstSegment,
		currentPath: segments.slice(1).join('/'),
	};
}

export function createTaskKey(taskSource: TaskSource, taskPath: string): string {
	//
	return `${taskSource}:${taskPath}`;
}

export function parseTaskKey(taskKey: string): { taskSource: TaskSource; taskPath: string } | null {
	//
	const separatorIndex = taskKey.indexOf(':');
	if (separatorIndex < 0) return null;

	const taskSource = taskKey.slice(0, separatorIndex);
	const taskPath = taskKey.slice(separatorIndex + 1);

	if (taskSource !== 'public' && taskSource !== 'private') return null;

	return {
		taskSource,
		taskPath,
	};
}

export function getSelectedTaskKey(
	search: ExplorerRouteSearch,
	currentSource: TaskSource | null,
	currentPath: string,
): string | null {
	//
	if (!search.selected) return null;
	if (search.selected.includes(':')) return search.selected;

	if (currentSource === null) {
		return null;
	}

	const selectedPath =
		currentPath.length === 0 ? search.selected : `${currentPath.replace(/\/+$/g, '')}/${search.selected}`;

	return createTaskKey(currentSource, selectedPath.replace(/^\/+|\/+$/g, ''));
}

export function getSelectedValue(task: ExplorerTask, currentSource: TaskSource | null, currentPath: string): string {
	//
	if (currentSource === null || task.taskSource !== currentSource) return task.key;
	if (currentPath.length === 0) return task.taskPath;

	const prefix = `${currentPath.replace(/\/+$/g, '')}/`;
	if (!task.taskPath.startsWith(prefix)) return task.taskPath;
	return task.taskPath.slice(prefix.length);
}

export function parseExpandedPanel(search: ExplorerRouteSearch): ExpandedPanel | null {
	//
	if (search.expanded === 'current') return 'current';
	if (search.expanded === 'subtasks') return 'subtasks';
	if (search.expanded === 'selected') return 'selected';
	if (search.detail === 'expanded') return 'selected';

	return null;
}

export function hasExplicitExpandedPanel(search: ExplorerRouteSearch): boolean {
	//
	return search.expanded !== undefined || search.detail === 'expanded';
}

export function getTaskRoutePath(task: { taskSource: TaskSource; taskPath: string }): string {
	//
	if (task.taskPath.length === 0) return `/${task.taskSource}`;
	return `/${task.taskSource}/${task.taskPath}`;
}

export function getExplorerParentKey(currentTaskKey: string | null): string {
	//
	return currentTaskKey ?? ROOT_PARENT_KEY;
}
