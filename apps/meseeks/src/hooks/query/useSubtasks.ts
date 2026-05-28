import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';

export function useSubtasks(parentId?: Id<'tasks'>) {
	//
	const query = convexQuery(api.tasks.findAll, { parentId });
	const result = useSuspenseQuery(query);

	const sortedSubtasks = (() => {
		//
		if (!result.data) return [];

		// separate active and inactive tasks (backend returns them in this order)
		const activeTasks = result.data.filter((task) => task.isActive);
		const inactiveTasks = result.data.filter((task) => !task.isActive);

		// sort only active tasks by status priority and creation time
		const sortedActiveTasks = activeTasks.sort((a, b) => {
			// status priority: blocked first, then unread, then all others
			const statusPriority = (status: string) => {
				if (status === 'blocked') return 0;
				if (status === 'unread') return 1;
				return 2;
			};

			const aPriority = statusPriority(a.status);
			const bPriority = statusPriority(b.status);

			// if different priorities, sort by priority
			if (aPriority !== bPriority) {
				return aPriority - bPriority;
			}

			// same priority, sort by creation time (descending - newest first)
			return b._creationTime - a._creationTime;
		});

		// inactive tasks don't need sorting (always "idle"), just append them
		return sortedActiveTasks.concat(inactiveTasks);
		//
	})();

	return {
		...result,
		subtasks: sortedSubtasks,
	};
}
