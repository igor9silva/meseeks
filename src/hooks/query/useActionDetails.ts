import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

export function useActionDetails(actionId: Id<'actions'>) {
	//
	const query = convexQuery(api.action_details.public.findByAction, { actionId });
	const result = useSuspenseQuery(query);

	return {
		...result,
		actionDetails: result.data,
	};
}
