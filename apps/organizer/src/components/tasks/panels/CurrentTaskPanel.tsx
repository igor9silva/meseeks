import type { TaskSource } from '~/lib/explorerSearchParams';
import { TaskDetailView } from '../TaskDetailView';
import type { TaskDetailResult } from '../taskExplorerTypes';

export interface CurrentTaskPanelState {
	detail: TaskDetailResult | undefined;
	isPending: boolean;
	isExpanded: boolean;
	shouldBlurPrivateTasks: boolean;
	tagOptions: string[];
}

export interface CurrentTaskPanelActions {
	onPanelCollapse: () => void;
	onExpandedToggle: () => void;
	onTaskSourceChanged: (taskKey: string, taskSource: TaskSource) => void;
	onTaskRenamed: (taskKey: string) => void;
	onTaskTrashed: () => void;
}

export function CurrentTaskPanel({ state, actions }: { state: CurrentTaskPanelState; actions: CurrentTaskPanelActions }) {
	//
	return (
		<section className="flex h-full min-h-0 flex-col overflow-hidden border border-border/80 bg-card">
			{state.isPending ? <div className="p-4 text-sm text-muted-foreground">Loading current task...</div> : null}
			{!state.isPending && state.detail?.task === null ? (
				<div className="p-4 text-sm text-muted-foreground">Current task not found in generated indexes.</div>
			) : null}
			{state.detail?.task ? (
				<TaskDetailView
					detail={state.detail}
					isInspectorExpanded={state.isExpanded}
					shouldBlurPrivateTasks={state.shouldBlurPrivateTasks}
					tagOptions={state.tagOptions}
					onPanelCollapse={actions.onPanelCollapse}
					onInspectorExpandedToggle={actions.onExpandedToggle}
					onTaskSourceChanged={actions.onTaskSourceChanged}
					onTaskRenamed={actions.onTaskRenamed}
					onTaskTrashed={actions.onTaskTrashed}
				/>
			) : null}
		</section>
	);
}
