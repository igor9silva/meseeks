import type { TaskSource } from '~/lib/explorerSearchParams';
import type { CreateTaskInput, getExplorerSnapshot, getTaskDetail } from '~/server/taskExplorer';

export type ExplorerSnapshotResult = Awaited<ReturnType<typeof getExplorerSnapshot>>;
export type ExplorerFacets = ExplorerSnapshotResult['facets'];
export type ExplorerHealth = ExplorerSnapshotResult['health'];
export type ExplorerTask = ExplorerSnapshotResult['tasks'][number];
export type ExplorerTotals = ExplorerSnapshotResult['totals'];
export type TaskDetailResult = NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>;
export type TaskDetailTask = NonNullable<TaskDetailResult['task']>;
export type CreateTaskDefaults = Pick<CreateTaskInput, 'status' | 'taskSource'>;
export type TaskCreatedResult = {
	status: string;
	taskKey: string;
	taskSource: TaskSource;
};
