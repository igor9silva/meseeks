import { useNavigate } from '@tanstack/react-router';
import { Doc } from 'convex/_generated/dataModel';
import { ArrowRight } from 'lucide-react';
import { TaskBudget } from '~/components/TaskBudget';
import { TaskStatusIndicator } from '~/components/TaskStatusIndicator';
import { TimeAgo } from '~/components/TimeAgo';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Separator } from '~/components/ui/separator';
import { TextShimmer } from '~/components/ui/text-shimmer';
import { useOptimisticTaskUpdate } from '~/hooks/useOptimisticTaskUpdate';
import { useTaskMutations } from '~/hooks/useTaskMutations';
import { cn } from '~/lib/utils';

export function TaskItem({
	task, //
	className,
}: {
	task: Doc<'tasks'>;
	className?: string;
}) {
	//
	const navigate = useNavigate();
	const { resolve, reopen } = useTaskMutations();
	const { updateTaskStatus } = useOptimisticTaskUpdate();

	const handleCheckboxChange = (checked: boolean) => {
		//
		// Optimistically update UI before the server responds
		updateTaskStatus({ task, isActive: !checked });

		// Execute the actual mutation
		checked ? resolve({ taskId: task._id }) : reopen({ taskId: task._id });
	};

	return (
		<div className={cn('flex items-center justify-between gap-2 p-2 align-middle min-w-0', className)}>
			<div className="flex items-center gap-2 min-w-0 flex-1">
				<div
					onClick={(e) => {
						//
						e.preventDefault();
						e.stopPropagation();
					}}
					className="flex-shrink-0"
				>
					<Checkbox
						id={`task-list-checkbox-${task._id}`}
						checked={!task.isActive}
						onCheckedChange={handleCheckboxChange}
					/>
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 min-w-0">
						<TaskTitle task={task} />
						<TaskStatusIndicator task={task} />
					</div>
					<div className="flex items-center gap-2 min-w-0">
						<TimeAgo date={task._creationTime} suffix="old" className="text-sm text-muted-foreground" />
						<Separator orientation="vertical" className="h-4 bg-primary" />
						<TaskBudget
							task={task}
							precision={2}
							showColors={false}
							className="text-sm text-muted-foreground"
						/>
					</div>
				</div>
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="justify-end [&_svg]:size-5 flex-shrink-0 hover:bg-transparent"
				onClick={(e) => {
					e.preventDefault();
					navigate({ to: '/$', params: { _splat: `/task/${task._id}` } });
				}}
			>
				<ArrowRight />
			</Button>
		</div>
	);
}

function TaskTitle({ task }: { task: Doc<'tasks'> }) {
	//
	const title = task.title || 'Untitled task';

	const classes = cn(
		'text-base font-semibold leading-none tracking-tight break-words overflow-wrap-anywhere truncate',
		!task.isActive && 'line-through',
		!task.title && 'text-muted-foreground',
	);

	if (task.status === 'acting') {
		return <TextShimmer className={classes} text={title} />;
	}

	return <h3 className={classes}>{title}</h3>;
}
