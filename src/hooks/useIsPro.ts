import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';

export function useIsPro() {
	//
	const activeSubsQuery = convexQuery(api.subscriptions.public.findActive, {});
	const { data: activeSubs } = useSuspenseQuery(activeSubsQuery);

	const isPro = Boolean(activeSubs && activeSubs.length > 0);

	return { isPro, activeSubs };
}
