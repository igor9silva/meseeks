import type { TaskDetailTask } from '../taskExplorerTypes';
import { TaskDetailActions } from './TaskDetailActions';
import { TaskDetailFilename } from './TaskDetailFilename';
import type { TaskDetailCallbacks, TaskDetailPanelControls } from './TaskDetailHeaderTypes';
import { TaskDetailMetadata } from './TaskDetailMetadata';
import { TaskDetailTitle } from './TaskDetailTitle';
import { TaskMutationErrors } from './TaskMutationErrors';
import { TaskSystemTags } from './TaskSystemTags';
import { useTaskDetailHeaderModel } from './useTaskDetailHeaderModel';

interface TaskDetailHeaderProps {
	task: TaskDetailTask;
	shouldBlurPrivateTasks: boolean;
	tagOptions: string[];
	callbacks: TaskDetailCallbacks;
	panel: TaskDetailPanelControls;
}

export function TaskDetailHeader(props: TaskDetailHeaderProps) {
	//
	const model = useTaskDetailHeaderModel(props);

	return (
		<header className="task-detail-header relative flex flex-col gap-3 border-b border-border/80 p-4">
			<div className="task-detail-heading flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
				<TaskDetailTitle {...model.title} />
				<TaskDetailFilename {...model.filename} />
			</div>

			<TaskDetailActions {...model.actions} />
			<TaskDetailMetadata model={model.metadata} />
			<TaskSystemTags {...model.tags} />
			<TaskMutationErrors entries={model.mutationErrors} />
		</header>
	);
}
