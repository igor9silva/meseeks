import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

export function useTaskAncestors(taskId: Id<'tasks'>) {
	//
	const query = convexQuery(api.tasks.public.findAncestors, { taskId });
	const result = useSuspenseQuery(query);

	return {
		...result,
		ancestors: result.data ?? [],
	};
}
