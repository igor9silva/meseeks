import { useCallback, useEffect, useLayoutEffect, type RefObject } from 'react';

interface UseInfiniteScrollProps {
	loadMore: (numItems: number) => void;
	hasMore: boolean;
	isLoading: boolean;
	scrollContainerRef: RefObject<HTMLElement | null>;
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

	const checkContentHeight = useCallback(() => {
		//
		if (!hasMore || isLoading) return;

		const container = scrollContainerRef.current;
		if (!container) return;

		const { scrollHeight, clientHeight } = container;

		// If content doesn't fill the container, load more automatically
		if (scrollHeight <= clientHeight) {
			loadMore(pageSize);
		}
		//
	}, [loadMore, hasMore, isLoading, scrollContainerRef, pageSize]);

	useEffect(() => {
		//
		const container = scrollContainerRef.current;
		if (!container) return;

		container.addEventListener('scroll', handleScroll);

		return () => {
			container.removeEventListener('scroll', handleScroll);
		};
		//
	}, [handleScroll, scrollContainerRef]);

	// Check content height after loading state changes or hasMore changes
	useLayoutEffect(() => {
		//
		// Use requestAnimationFrame to ensure DOM is fully rendered
		const animationFrameId = requestAnimationFrame(() => {
			checkContentHeight();
		});

		return () => cancelAnimationFrame(animationFrameId);
		//
	}, [checkContentHeight, isLoading, hasMore]);

	return {};
}
