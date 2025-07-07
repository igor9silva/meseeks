import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';

export function useSchedules() {
	//
	const query = convexQuery(api.schedules.public.listByOwner, {});
	const result = useSuspenseQuery(query);

	return {
		...result,
		schedules: result.data,
	};
}
