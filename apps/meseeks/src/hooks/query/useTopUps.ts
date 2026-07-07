import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';

export function useWaitingTopUps() {
	//
	const query = convexQuery(api.topUps.findAllWaiting, {});
	const result = useSuspenseQuery(query);

	return {
		...result,
		waitingTopUps: result.data,
	};
}

export function useTopUpHistory() {
	//
	const query = convexQuery(api.topUps.findAllHistory, {});
	const result = useSuspenseQuery(query);

	return {
		...result,
		topUpHistory: result.data,
	};
}

export function useTopUp(topUpId: Id<'top_ups'>) {
	//
	const query = convexQuery(api.topUps.findOne, { topUpId });
	const result = useSuspenseQuery(query);

	return {
		...result,
		topUp: result.data,
	};
}
