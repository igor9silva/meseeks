import { usePaginatedQuery } from 'convex/react';
import { RefObject } from 'react';
import { Loading } from '~/components/Loading';
import { useInfiniteScroll } from '@pro/ui/hooks/useInfiniteScroll';
import { ActiveFileItem } from './ActiveFileItem';
import { api } from 'convex/_generated/api';

const PAGE_SIZE = 50;

interface ActiveFilesTabProps {
	scrollContainerRef: RefObject<HTMLElement | null>;
}

export function ActiveFilesTab({ scrollContainerRef }: ActiveFilesTabProps) {
	//
	const {
		results: activeFiles,
		loadMore,
		status,
	} = usePaginatedQuery(api.fileViews.findAllPaginated, {}, { initialNumItems: PAGE_SIZE });

	useInfiniteScroll({
		loadMore,
		hasMore: status === 'CanLoadMore',
		isLoading: status === 'LoadingMore' || status === 'LoadingFirstPage',
		scrollContainerRef,
		pageSize: PAGE_SIZE,
	});

	return (
		<div className="flex flex-col h-full">
			<div className="space-y-2">
				{activeFiles.map((file) => (
					<ActiveFileItem key={file._id} file={file} />
				))}
				{activeFiles.length === 0 && status !== 'LoadingFirstPage' && (
					<div className="text-muted-foreground text-center py-8">No active files.</div>
				)}
				{status === 'LoadingFirstPage' && <Loading className="mt-4" />}
				{status === 'LoadingMore' && (
					<div className="flex justify-center pt-4">
						<Loading className="mt-4" />
					</div>
				)}
			</div>
		</div>
	);
}
