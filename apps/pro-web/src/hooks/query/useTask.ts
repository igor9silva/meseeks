import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';

export function useTask(taskId: Id<'tasks'>) {
	//
	const query = convexQuery(api.tasks.findOne, { taskId });
	const result = useSuspenseQuery(query);

	return {
		...result,
		task: result.data,
	};
}
