import { usePaginatedQuery } from 'convex/react';
import type { Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import type { FileView } from './query/useFile';

interface UseSuspensePaginatedQueryOptions {
	parentId?: Id<'files'>;
	initialNumItems?: number;
}

interface UsePaginatedConventionFilesOptions {
	convention: 'task';
	initialNumItems?: number;
}

export function usePaginatedFiles(options: UseSuspensePaginatedQueryOptions = {}) {
	//
	const { parentId, initialNumItems = 20 } = options;

	const { results, status, loadMore, isLoading } = usePaginatedQuery(
		api.fileViews.findAllAtInboxPaginated,
		{ parentId },
		{ initialNumItems },
	);

	const files = sortFiles(results ?? []);

	return {
		results,
		status,
		loadMore,
		isLoading,
		hasMore: status === 'CanLoadMore',
		isLoadingMore: status === 'LoadingMore',
		isLoadingFirstPage: status === 'LoadingFirstPage',
		files,
	};
}

export function usePaginatedConventionFiles(options: UsePaginatedConventionFilesOptions) {
	//
	const { initialNumItems = 20 } = options;

	const { results, status, loadMore, isLoading } = usePaginatedQuery(
		api.fileViews.findAllPaginated,
		{},
		{ initialNumItems },
	);

	const files = sortFiles(results ?? []);

	return {
		results,
		status,
		loadMore,
		isLoading,
		hasMore: status === 'CanLoadMore',
		isLoadingMore: status === 'LoadingMore',
		isLoadingFirstPage: status === 'LoadingFirstPage',
		files,
	};
}

function sortFiles(files: FileView[]) {
	//
	const activeFiles = files.filter((file) => file.isActive);
	const inactiveFiles = files.filter((file) => !file.isActive);

	activeFiles.sort((a, b) => {
		const aPriority = statusPriority(a.status);
		const bPriority = statusPriority(b.status);

		if (aPriority !== bPriority) return aPriority - bPriority;

		return b._creationTime - a._creationTime;
	});

	return activeFiles.concat(inactiveFiles);
}

function statusPriority(status: FileView['status']) {
	//
	if (status === 'blocked') return 0;
	if (status === 'unread') return 1;
	return 2;
}
