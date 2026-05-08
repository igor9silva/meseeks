import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';

export function useActionDetails(actionId: Id<'actions'>) {
	//
	const query = convexQuery(api.action.details.find, { actionId });
	const result = useSuspenseQuery(query);

	return {
		...result,
		actionDetails: result.data,
	};
}
