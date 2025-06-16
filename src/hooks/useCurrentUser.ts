import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';

export function useCurrentUser() {
	//
	const query = convexQuery(api.users.public.current, {});
	const { data: user } = useSuspenseQuery(query);

	return user;
}
