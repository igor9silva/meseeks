import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';

export function useIntelligences() {
	//
	const query = convexQuery(api.skills.public.availableIntelligences, {});
	const result = useSuspenseQuery(query);

	return {
		...result,
		intelligences: result.data,
	};
}
