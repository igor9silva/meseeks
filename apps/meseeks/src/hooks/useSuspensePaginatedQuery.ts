import { usePaginatedQuery } from 'convex/react';
import type { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';

interface UseSuspensePaginatedQueryOptions {
	parentId?: Id<'tasks'>;
	initialNumItems?: number;
}

/**
 * Specialized hook for paginated subtasks that maintains the same sorting logic
 * as the original useSubtasks hook
 */
export function usePaginatedSubtasks(options: UseSuspensePaginatedQueryOptions = {}) {
	//
	const { parentId, initialNumItems = 20 } = options;

	const { results, status, loadMore, isLoading } = usePaginatedQuery(
		api.tasks.findAllAtInboxPaginated,
		{ parentId },
		{ initialNumItems },
	);

	const sortedResults = (() => {
		//
		if (!results) return [];

		// Apply the same sorting logic as useSubtasks
		const activeTasks = results.filter((task) => task.isActive);
		const inactiveTasks = results.filter((task) => !task.isActive);

		// Sort only active tasks by status priority and creation time
		const sortedActiveTasks = activeTasks.sort((a, b) => {
			// Status priority: blocked first, then unread, then all others
			const statusPriority = (status: string) => {
				if (status === 'blocked') return 0;
				if (status === 'unread') return 1;
				return 2;
			};

			const aPriority = statusPriority(a.status);
			const bPriority = statusPriority(b.status);

			// If different priorities, sort by priority
			if (aPriority !== bPriority) {
				return aPriority - bPriority;
			}

			// Same priority, sort by creation time (descending - newest first)
			return b._creationTime - a._creationTime;
		});

		// Inactive tasks don't need sorting (always "idle"), just append them
		return sortedActiveTasks.concat(inactiveTasks);
		//
	})();

	return {
		results,
		status,
		loadMore,
		isLoading,
		hasMore: status === 'CanLoadMore',
		isLoadingMore: status === 'LoadingMore',
		isLoadingFirstPage: status === 'LoadingFirstPage',
		subtasks: sortedResults,
	};
}
