import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

export function useTask(taskId: Id<'tasks'>) {
	//
	const taskQuery = convexQuery(api.tasks.public.findOne, { taskId });
	const result = useSuspenseQuery(taskQuery);

	return {
		...result,
		task: result.data,
	};
}
