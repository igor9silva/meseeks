import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { type Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';

export function useSchedules() {
	//
	const query = convexQuery(api.schedules.findByOwner, {});
	const result = useSuspenseQuery(query);

	return {
		...result,
		schedules: result.data,
	};
}

export function useTaskSchedules(taskId: Id<'tasks'>) {
	//
	const query = convexQuery(api.schedules.findByTask, { taskId });
	const result = useSuspenseQuery(query);

	return {
		...result,
		schedules: result.data,
	};
}
