import { Link } from '@tanstack/react-router';
import { Suspense } from 'react';
import { Loading } from '~/components/Loading';
import { QuickSeek } from '~/components/QuickSeek';
import { TaskItem } from '~/components/TaskItem';
import { useSubtasks } from '~/hooks/query/useSubtasks';

export function Inbox() {
	//
	return (
		<Suspense fallback={<Loading />}>
			<InboxContent />
		</Suspense>
	);
}

function InboxContent() {
	//
	const { subtasks } = useSubtasks();

	return (
		<div className="overflow-auto h-full">
			{subtasks.length === 0 && <QuickSeek />}
			{subtasks.map((task) => (
				<Link
					key={task._id}
					to="/$"
					params={{ _splat: `/task/${task._id}` }}
					resetScroll={false}
					className="block min-w-0"
				>
					<TaskItem task={task} />
				</Link>
			))}
		</div>
	);
}
