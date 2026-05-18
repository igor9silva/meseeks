import { cn } from '@reactor/ui';
import { ArrowRight, Clock3, Lock } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { parseTaskTag } from '~/lib/taskTags';
import {
	formatTaskDate,
	getPriorityBorderClassName,
	getPriorityClassName,
	getPrivateBlurClassName,
	getTagClassName,
} from './taskDisplay';
import type { TaskListContext } from './taskListTypes';
import type { ExplorerTask } from '../taskExplorerTypes';
import { getTaskRoutePath } from '../taskExplorerRouting';

export function TaskRow({
	task,
	taskList,
}: {
	task: ExplorerTask;
	taskList: TaskListContext;
}) {
	//
	const isSelected = taskList.selectedTaskKey === task.key;
	const shouldBlurTask = taskList.shouldBlurPrivateTasks && task.taskSource === 'private';
	const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;

		event.preventDefault();
		taskList.onTaskSelect(task);
	};

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={() => taskList.onTaskSelect(task)}
			onKeyDown={handleRowKeyDown}
			className={cn(
				'group block w-full cursor-pointer border-l-2 px-3 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
				getPriorityBorderClassName(task.priority),
				isSelected && 'bg-muted',
			)}
		>
			<div className="flex min-w-0 items-start gap-2">
				<div className={cn('min-w-0 flex-1 space-y-2', getPrivateBlurClassName(shouldBlurTask))}>
					<TaskRowTitle task={task} taskList={taskList} />
					<TaskRowMetadata task={task} />
					<TaskRowTags task={task} />
				</div>
			</div>
		</div>
	);
}

function TaskRowTitle({ task, taskList }: { task: ExplorerTask; taskList: TaskListContext }) {
	//
	const taskHref = getTaskRoutePath(task);

	return (
		<div className="flex min-w-0 items-start gap-2">
			<div className="min-w-0 flex-1 break-words text-sm font-medium leading-5 text-foreground">
				{task.title}
			</div>
			<a
				href={taskHref}
				aria-label={`Navigate into ${task.title}`}
				title="Navigate into task"
				onClick={(event) => {
					event.stopPropagation();

					if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
						return;
					}

					event.preventDefault();
					taskList.onTaskOpen(task);
				}}
				onAuxClick={(event) => {
					event.stopPropagation();
				}}
				className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-colors hover:bg-accent hover:text-foreground group-hover:opacity-100"
			>
				<ArrowRight className="size-4" />
			</a>
		</div>
	);
}

function TaskRowMetadata({ task }: { task: ExplorerTask }) {
	//
	return (
		<div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
			<span className="inline-flex items-center gap-1">
				<Clock3 className="size-3" aria-hidden="true" />
				{formatTaskDate(task.fileMtimeMs)}
			</span>
			{task.taskSource === 'private' ? (
				<span className="inline-flex items-center gap-1">
					<Lock className="size-3" aria-hidden="true" />
					private
				</span>
			) : null}
			{task.priority ? (
				<span className={cn('rounded px-1.5 py-0.5', getPriorityClassName(task.priority))}>
					{task.priority}
				</span>
			) : null}
		</div>
	);
}

function TaskRowTags({ task }: { task: ExplorerTask }) {
	//
	const regularTags = task.tags.filter((tag) => parseTaskTag(tag).key === null);

	if (regularTags.length === 0) return null;

	return (
		<div className="flex flex-wrap gap-1">
			{regularTags.slice(0, 5).map((tag) => (
				<span key={tag} className={cn('rounded px-1.5 py-0.5 text-xs', getTagClassName(tag))}>
					{tag}
				</span>
			))}
			{regularTags.length > 5 ? (
				<span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
					+{regularTags.length - 5}
				</span>
			) : null}
		</div>
	);
}
