import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';

export function useComposition(slug: string) {
	//
	const query = convexQuery(api.components.public.findOneBySlug, { slug });
	const result = useSuspenseQuery(query);

	return {
		...result,
		composition: result.data,
	};
}
