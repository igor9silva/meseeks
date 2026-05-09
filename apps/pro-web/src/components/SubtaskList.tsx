import { Id } from 'convex/_generated/dataModel';
import { Suspense } from 'react';

import { Loading } from '~/components/Loading';
import { TaskItem } from '~/components/TaskItem';
import { useSubtasks } from '~/hooks/query/useSubtasks';
import { cn } from '@reactor/ui/lib/utils';

export function SubtaskList({
	taskId, //
	className,
}: {
	taskId: Id<'tasks'>;
	className?: string;
}) {
	return (
		<Suspense fallback={<Loading />}>
			<SubtaskListContent taskId={taskId} className={className} />
		</Suspense>
	);
}

function SubtaskListContent({
	taskId, //
	className,
}: {
	taskId: Id<'tasks'>;
	className?: string;
}) {
	const { subtasks } = useSubtasks(taskId);

	if (subtasks.length === 0) {
		return <div className="flex flex-col items-center justify-center h-full w-full">No subtasks.</div>;
	}

	return (
		<div className="flex flex-col gap-2 overflow-auto h-full">
			<h3 className="py-2 px-4 text-xl font-medium sticky top-0 bg-background/75">Subtasks</h3>
			<div className={cn('', className)}>
				{subtasks.map((task) => (
					<TaskItem key={task._id} task={task} />
				))}
			</div>
		</div>
	);
}
