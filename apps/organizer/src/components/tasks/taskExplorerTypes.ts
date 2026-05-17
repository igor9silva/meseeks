import type { TaskSource } from '~/lib/explorerSearchParams';
import type { CreateTaskInput, getExplorerSnapshot, getTaskByPath, getTaskDetail } from '~/server/taskExplorer';

export type ExplorerSnapshotResult = Awaited<ReturnType<typeof getExplorerSnapshot>>;
export type ExplorerFacets = ExplorerSnapshotResult['facets'];
export type ExplorerHealth = ExplorerSnapshotResult['health'];
export type ExplorerTask = ExplorerSnapshotResult['tasks'][number];
export type ExplorerTotals = ExplorerSnapshotResult['totals'];
export type TaskDetailResult = NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>;
export type TaskByPathResult = NonNullable<Awaited<ReturnType<typeof getTaskByPath>>>;
export type TaskDetailTask = NonNullable<TaskDetailResult['task']>;
export type CreateTaskDefaults = Pick<CreateTaskInput, 'parentPath' | 'status' | 'taskSource'>;
export type TaskCreatedResult = {
	taskKey: string;
	taskPath: string;
	taskSource: TaskSource;
};
