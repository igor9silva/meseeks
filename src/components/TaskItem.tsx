import { Link } from '@tanstack/react-router';
import type { Doc } from 'convex/_generated/dataModel';
import { Archive, Check, Loader2 } from 'lucide-react';
import { TaskBudget } from '~/components/TaskBudget';
import { TaskStatusIndicator } from '~/components/TaskStatusIndicator';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { TextShimmer } from '~/components/ui/text-shimmer';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { useDiscard, useResolve } from '~/hooks/useTaskMutations';
import { formatTaskItemTimestamp, formatTaskItemTimestampTooltip } from '~/lib/taskItemTimestamp';
import { cn } from '~/lib/utils';

export function TaskItem({
	task, //
	className,
}: {
	task: Doc<'tasks'>;
	className?: string;
}) {
	//
	return (
		<div className={cn('group flex items-stretch justify-between min-w-0', className)}>
			<Link
				to="/$"
				params={{ _splat: `task/${task._id}` }}
				resetScroll={false}
				className="flex items-center gap-1 py-2.5 pr-2 pl-1 align-middle min-w-0 flex-1"
			>
				<div className="flex w-4 shrink-0 justify-center self-stretch pt-1.5">
					<TaskStatusIndicator task={task} />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 min-w-0">
						<TaskTitle task={task} />
					</div>
					<div className="flex items-center gap-2 min-w-0">
						<TaskItemTimestamp
							date={task._creationTime}
							className="text-sm text-muted-foreground truncate"
						/>
						<Separator orientation="vertical" className="h-4 bg-primary" />
						<TaskBudget
							task={task}
							precision={2}
							showColors={false}
							className="text-sm text-muted-foreground"
						/>
					</div>
				</div>
			</Link>
			{task.isActive && <TaskItemActions task={task} />}
			{/* <Button
				variant="ghost"
				size="icon"
				className="justify-end [&_svg]:size-5 flex-shrink-0 hover:bg-transparent"
				onClick={(e) => {
					e.preventDefault();
					navigate({ to: '/$', params: { _splat: `task/${task._id}` } });
				}}
			>
				<ArrowRight />
			</Button> */}
		</div>
	);
}

function TaskItemActions({ task }: { task: Doc<'tasks'> }) {
	//
	const { resolve, isResolving } = useResolve();
	const { discard, isDiscarding } = useDiscard();

	const isBusy = isResolving || isDiscarding;

	const handleDiscard = () => {
		//
		if (isBusy) return;
		discard({ taskId: task._id });
	};

	const handleResolve = () => {
		//
		if (isBusy) return;
		resolve({ taskId: task._id });
	};

	return (
		<TooltipProvider>
			<div className="flex shrink-0 items-center gap-1.5 py-2 pr-3 pl-1">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="hidden size-8 rounded-xl text-muted-foreground hover:text-destructive group-hover:inline-flex group-focus-within:inline-flex"
							onClick={handleDiscard}
							disabled={isBusy}
							aria-label="Discard task"
						>
							{isDiscarding ? <Loader2 className="animate-spin" /> : <Archive />}
						</Button>
					</TooltipTrigger>
					<TooltipContent>Discard</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="size-8 rounded-xl"
							onClick={handleResolve}
							disabled={isBusy}
							aria-label="Resolve task"
						>
							{isResolving ? <Loader2 className="animate-spin" /> : <Check />}
						</Button>
					</TooltipTrigger>
					<TooltipContent>Resolve</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
}

function TaskItemTimestamp({
	date, //
	className,
}: {
	date: number | Date;
	className?: string;
}) {
	//
	const value = new Date(date);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<time className={cn('cursor-help', className)} dateTime={formatTaskItemTimestampTooltip(value)}>
						{formatTaskItemTimestamp(value)}
					</time>
				</TooltipTrigger>
				<TooltipContent className="text-xs">
					<span>Created at:</span>
					<div className="font-mono">{formatTaskItemTimestampTooltip(value)}</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function TaskTitle({ task }: { task: Doc<'tasks'> }) {
	//
	const title = task.title || 'Untitled task';

	const classes = cn(
		'min-w-0 flex-1 text-base font-semibold leading-none tracking-tight break-words overflow-wrap-anywhere truncate',
		!task.isActive && 'line-through',
		!task.title && 'text-muted-foreground',
	);

	if (task.status === 'acting') {
		return <TextShimmer className={classes} text={title} />;
	}

	return <h3 className={classes}>{title}</h3>;
}
