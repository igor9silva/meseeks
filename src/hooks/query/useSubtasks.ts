import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

export function useSubtasks(parentId?: Id<'tasks'>) {
	//
	const query = convexQuery(api.tasks.public.findAll, { parentId });
	const result = useSuspenseQuery(query);

	return {
		...result,
		subtasks: result.data,
	};
}
