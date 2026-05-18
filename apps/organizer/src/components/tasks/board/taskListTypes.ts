import type { ExplorerTask } from '../taskExplorerTypes';

export interface TaskListContext {
	selectedTaskKey: string | null;
	shouldBlurPrivateTasks: boolean;
	onTaskSelect: (task: ExplorerTask) => void;
	onTaskOpen: (task: ExplorerTask) => void;
}
