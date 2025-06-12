import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

import { TaskItem } from '~/components/TaskItem';
import { cn } from '~/lib/utils';

export function SubtaskList({
	taskId, //
	className,
}: {
	taskId: Id<'tasks'>;
	className?: string;
}) {
	const query = convexQuery(api.tasks.public.findAll, { parentId: taskId });
	const { data: subtasks } = useSuspenseQuery(query);

	if (subtasks.length === 0) {
		return <div className="flex flex-col items-center justify-center h-full w-full">No subtasks.</div>;
	}

	return (
		<div className="flex flex-col gap-2 overflow-auto h-full">
			<h3 className="py-2 px-4 text-xl font-medium sticky top-0 bg-background/75">Subtasks</h3>
			<div className={cn('', className)}>
				{subtasks.map((task) => (
					<Link key={task._id} to="/$" params={{ _splat: `/task/${task._id}` }} resetScroll={false}>
						<TaskItem task={task} />
					</Link>
				))}
			</div>
		</div>
	);
}
