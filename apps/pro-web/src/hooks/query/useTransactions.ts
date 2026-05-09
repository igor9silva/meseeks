import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';

export function useActiveTaskEnergy() {
	//
	const query = convexQuery(api.users.findActiveTaskEnergy, {});
	const result = useSuspenseQuery(query);

	return {
		...result,
		activeTaskEnergy: result.data,
	};
}
