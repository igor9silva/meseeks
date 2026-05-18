import type { TaskSource } from '~/lib/explorerSearchParams';

export interface TaskDetailCallbacks {
	onTaskSourceChanged: (taskKey: string, taskSource: TaskSource) => void;
	onTaskRenamed: (taskKey: string) => void;
	onTaskTrashed: (taskKey: string) => void;
}

export interface TaskDetailPanelControls {
	isInspectorExpanded: boolean;
	onInspectorExpandedToggle: () => void;
	onPanelCollapse?: () => void;
	onPanelExpand?: () => void;
	onOpenTask?: () => void;
}
