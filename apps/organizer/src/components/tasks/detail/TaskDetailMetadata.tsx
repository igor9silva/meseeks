import {
	formatSourceLabel,
	taskPriorityOptions,
	taskSourceOptions,
} from '~/components/tasks/taskExplorerUtils';
import type { TaskDetailTask } from '../taskExplorerTypes';
import { TimestampButton } from './TimestampButton';

export interface TaskDetailMetadataModel {
	task: TaskDetailTask;
	priorityInputId: string;
	sourceInputId: string;
	privateBlurClassName: string;
	shouldBlurTask: boolean;
	isStructural: boolean;
	isPriorityPending: boolean;
	isSourcePending: boolean;
	onPriorityChange: (value: string) => void;
	onSourceChange: (value: string) => void;
	onTimestampCopy: (value: string) => Promise<void>;
}

export function TaskDetailMetadata({ model }: { model: TaskDetailMetadataModel }) {
	//
	return (
		<div className="flex flex-wrap items-end gap-x-4 gap-y-2 text-xs">
			<div className="min-w-28">
				<label className="text-muted-foreground" htmlFor={model.priorityInputId}>
					Priority
				</label>
				<select
					id={model.priorityInputId}
					value={model.task.priority ?? ''}
					onChange={(event) => model.onPriorityChange(event.currentTarget.value)}
					disabled={model.isPriorityPending || model.isStructural}
					className={`mt-0.5 h-7 w-full rounded-sm border border-input bg-background px-2 font-medium text-foreground disabled:opacity-50 ${model.privateBlurClassName}`}
				>
					<option value="" disabled>
						none
					</option>
					{taskPriorityOptions.map((priorityOption) => (
						<option key={priorityOption} value={priorityOption}>
							{priorityOption}
						</option>
					))}
				</select>
			</div>
			<div className="min-w-24">
				<label className="text-muted-foreground" htmlFor={model.sourceInputId}>
					Visibility
				</label>
				<select
					id={model.sourceInputId}
					value={model.task.taskSource}
					onChange={(event) => model.onSourceChange(event.currentTarget.value)}
					disabled={model.isSourcePending || model.isStructural}
					className={`mt-0.5 h-7 w-full rounded-sm border border-input bg-background px-2 font-medium text-foreground disabled:opacity-50 ${model.privateBlurClassName}`}
				>
					{taskSourceOptions.map((sourceOption) => (
						<option key={sourceOption} value={sourceOption}>
							{formatSourceLabel(sourceOption)}
						</option>
					))}
				</select>
			</div>
			<TimestampButton
				label="Created"
				value={model.task.created}
				shouldBlur={model.shouldBlurTask}
				onCopy={model.onTimestampCopy}
			/>
			<TimestampButton
				label="Updated"
				value={model.task.updated}
				shouldBlur={model.shouldBlurTask}
				onCopy={model.onTimestampCopy}
			/>
		</div>
	);
}
