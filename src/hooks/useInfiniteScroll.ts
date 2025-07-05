import { RefObject, useCallback, useEffect } from 'react';

interface UseInfiniteScrollProps {
	loadMore: (numItems: number) => void;
	hasMore: boolean;
	isLoading: boolean;
	scrollContainerRef: RefObject<HTMLElement>;
	threshold?: number; // Percentage of scroll to trigger load more (default: 0.8)
	pageSize?: number; // Number of items to load per page (default: 50)
}

export function useInfiniteScroll({
	loadMore,
	hasMore,
	isLoading,
	scrollContainerRef,
	threshold = 0.8,
	pageSize = 50,
}: UseInfiniteScrollProps) {
	//
	const handleScroll = useCallback(() => {
		//
		if (!hasMore || isLoading) return;

		const container = scrollContainerRef.current;
		if (!container) return;

		const { scrollTop, scrollHeight, clientHeight } = container;
		const scrolledPercentage = (scrollTop + clientHeight) / scrollHeight;

		// Load more when user scrolls to threshold of the content
		if (scrolledPercentage >= threshold) {
			loadMore(pageSize);
		}
		//
	}, [loadMore, hasMore, isLoading, scrollContainerRef, threshold, pageSize]);

	useEffect(() => {
		//
		const container = scrollContainerRef.current;
		if (!container) return;

		container.addEventListener('scroll', handleScroll);

		return () => {
			container.removeEventListener('scroll', handleScroll);
		};
		//
	}, [handleScroll]);

	return {};
}
