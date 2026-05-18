import type { TaskSource } from '~/lib/explorerSearchParams';
import { CreateTaskView } from '../CreateTaskView';
import { TaskDetailView } from '../TaskDetailView';
import type { CreateTaskDefaults, TaskCreatedResult, TaskDetailResult } from '../taskExplorerTypes';

export interface InspectorPanelState {
	createTaskDefaults: CreateTaskDefaults | null;
	selectedTaskKey: string | null;
	detail: TaskDetailResult | undefined;
	isDetailPending: boolean;
	isExpanded: boolean;
	shouldShowTaskNotFound: boolean;
	shouldBlurPrivateTasks: boolean;
	tagOptions: string[];
}

export interface InspectorPanelActions {
	onCreateCancel: () => void;
	onTaskCreated: (result: TaskCreatedResult) => void;
	onPanelExpand?: () => void;
	onExpandedToggle: () => void;
	onTaskSourceChanged: (taskKey: string, taskSource: TaskSource) => void;
	onTaskRenamed: (taskKey: string) => void;
	onTaskTrashed: (taskKey: string) => void;
	onOpenTask: () => void;
}

export function InspectorPanel({ state, actions }: { state: InspectorPanelState; actions: InspectorPanelActions }) {
	//
	const isCreatingTask = state.createTaskDefaults !== null;

	return (
		<section className="flex h-full min-h-0 flex-col overflow-hidden border border-border/80 bg-card">
			{state.createTaskDefaults !== null && (
				<CreateTaskView
					defaults={state.createTaskDefaults}
					onCancel={actions.onCreateCancel}
					onTaskCreated={actions.onTaskCreated}
				/>
			)}
			{!isCreatingTask && state.selectedTaskKey !== null && state.isDetailPending && (
				<div className="p-4 text-sm text-muted-foreground">Loading task detail...</div>
			)}
			{state.shouldShowTaskNotFound && (
				<div className="p-4 text-sm text-muted-foreground">Task not found in generated indexes.</div>
			)}
			{!isCreatingTask && state.detail?.task && (
				<TaskDetailView
					detail={state.detail}
					isInspectorExpanded={state.isExpanded}
					shouldBlurPrivateTasks={state.shouldBlurPrivateTasks}
					tagOptions={state.tagOptions}
					onPanelExpand={actions.onPanelExpand}
					onInspectorExpandedToggle={actions.onExpandedToggle}
					onTaskSourceChanged={actions.onTaskSourceChanged}
					onTaskRenamed={actions.onTaskRenamed}
					onTaskTrashed={actions.onTaskTrashed}
					onOpenTask={actions.onOpenTask}
				/>
			)}
		</section>
	);
}
