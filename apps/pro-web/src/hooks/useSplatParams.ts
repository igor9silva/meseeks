import { useParams } from '@tanstack/react-router';
import { Id } from 'convex/_generated/dataModel';

export function useSplatParams() {
	//
	const params = useParams({ strict: false });
	const parts = params?._splat?.split('/') ?? [];

	// must be `/`, `/page` or `/page/taskId`
	if (parts.length > 2) {
		throw new Error('Invalid URL');
	}

	return {
		slug: parts.at(0) as string,
		taskId: parts.at(1) as Id<'tasks'> | undefined,
	};
}
