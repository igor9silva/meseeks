import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';

export function useLockedBalance() {
	//
	const query = convexQuery(api.users.public.findLockedBalance, {});
	const result = useSuspenseQuery(query);

	return {
		...result,
		lockedBalance: result.data,
	};
}
