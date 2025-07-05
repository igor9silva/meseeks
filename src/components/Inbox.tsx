import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { QuickAdd } from '~/components/QuickAdd';
import { TaskItem } from '~/components/TaskItem';

export function Inbox() {
	//
	const query = convexQuery(api.tasks.public.findAll, {});
	const { data: subtasks } = useSuspenseQuery(query);

	return (
		<div className="overflow-auto h-full">
			{subtasks.length === 0 && <QuickAdd />}
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
