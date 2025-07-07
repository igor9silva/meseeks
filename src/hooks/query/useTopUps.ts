import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

export function useWaitingTopUps() {
	//
	const query = convexQuery(api.topUps.public.findAllWaiting, {});
	const result = useSuspenseQuery(query);

	return {
		...result,
		waitingTopUps: result.data,
	};
}

export function useTopUpHistory() {
	//
	const query = convexQuery(api.topUps.public.findAllHistory, {});
	const result = useSuspenseQuery(query);

	return {
		...result,
		topUpHistory: result.data,
	};
}

export function useTopUp(topUpId: Id<'topUps'>) {
	//
	const query = convexQuery(api.topUps.public.findOne, { topUpId });
	const result = useSuspenseQuery(query);

	return {
		...result,
		topUp: result.data,
	};
}
