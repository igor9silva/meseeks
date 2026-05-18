import type { TaskSource } from '~/lib/explorerSearchParams';
import { TaskDetailBody } from './detail/TaskDetailBody';
import { TaskDetailHeader } from './detail/TaskDetailHeader';
import { getDirectoryPath } from './detail/taskDetailUtils';
import type { TaskDetailResult, TaskDetailTask } from './taskExplorerTypes';

export function TaskDetailView({
	detail,
	isInspectorExpanded,
	shouldBlurPrivateTasks,
	tagOptions,
	onInspectorExpandedToggle,
	onTaskSourceChanged,
	onTaskRenamed,
	onTaskTrashed,
	onPanelCollapse,
	onPanelExpand,
	onOpenTask,
}: {
	detail: TaskDetailResult;
	isInspectorExpanded: boolean;
	shouldBlurPrivateTasks: boolean;
	tagOptions: string[];
	onInspectorExpandedToggle: () => void;
	onTaskSourceChanged: (taskKey: string, taskSource: TaskSource) => void;
	onTaskRenamed: (taskKey: string) => void;
	onTaskTrashed: (taskKey: string) => void;
	onPanelCollapse?: () => void;
	onPanelExpand?: () => void;
	onOpenTask?: () => void;
}) {
	//
	if (!detail.task) return null;

	return (
		<TaskDetailContent
			key={detail.task.key}
			task={detail.task}
			isInspectorExpanded={isInspectorExpanded}
			shouldBlurPrivateTasks={shouldBlurPrivateTasks}
			tagOptions={tagOptions}
			onInspectorExpandedToggle={onInspectorExpandedToggle}
			onTaskSourceChanged={onTaskSourceChanged}
			onTaskRenamed={onTaskRenamed}
			onTaskTrashed={onTaskTrashed}
			onPanelCollapse={onPanelCollapse}
			onPanelExpand={onPanelExpand}
			onOpenTask={onOpenTask}
		/>
	);
}

function TaskDetailContent({
	task,
	isInspectorExpanded,
	shouldBlurPrivateTasks,
	tagOptions,
	onInspectorExpandedToggle,
	onTaskSourceChanged,
	onTaskRenamed,
	onTaskTrashed,
	onPanelCollapse,
	onPanelExpand,
	onOpenTask,
}: {
	task: TaskDetailTask;
	isInspectorExpanded: boolean;
	shouldBlurPrivateTasks: boolean;
	tagOptions: string[];
	onInspectorExpandedToggle: () => void;
	onTaskSourceChanged: (taskKey: string, taskSource: TaskSource) => void;
	onTaskRenamed: (taskKey: string) => void;
	onTaskTrashed: (taskKey: string) => void;
	onPanelCollapse?: () => void;
	onPanelExpand?: () => void;
	onOpenTask?: () => void;
}) {
	//
	const taskAssetBasePath = getDirectoryPath(task.absolutePath);
	const shouldBlurTask = shouldBlurPrivateTasks && task.taskSource === 'private';

	return (
		<div className="h-full overflow-auto bg-background text-foreground">
			<TaskDetailHeader
				task={task}
				shouldBlurPrivateTasks={shouldBlurPrivateTasks}
				tagOptions={tagOptions}
				callbacks={{
					onTaskSourceChanged,
					onTaskRenamed,
					onTaskTrashed,
				}}
				panel={{
					isInspectorExpanded,
					onInspectorExpandedToggle,
					onPanelCollapse,
					onPanelExpand,
					onOpenTask,
				}}
			/>
			<TaskDetailBody
				body={task.body}
				warnings={task.warnings}
				assetBasePath={taskAssetBasePath}
				shouldBlur={shouldBlurTask}
			/>
		</div>
	);
}
