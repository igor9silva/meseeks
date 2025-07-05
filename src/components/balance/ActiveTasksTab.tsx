import { api } from 'convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { RefObject } from 'react';
import { Loading } from '~/components/Loading';
import { useInfiniteScroll } from '~/hooks/useInfiniteScroll';
import { ActiveTaskItem } from './ActiveTaskItem';

const PAGE_SIZE = 50;

interface ActiveTasksTabProps {
	scrollContainerRef: RefObject<HTMLElement>;
}

export function ActiveTasksTab({ scrollContainerRef }: ActiveTasksTabProps) {
	//
	const {
		results: activeTasks,
		loadMore,
		status,
	} = usePaginatedQuery(api.tasks.public.findAllPaginated, {}, { initialNumItems: PAGE_SIZE });

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
				{activeTasks.map((task) => (
					<ActiveTaskItem key={task._id} task={task} />
				))}
				{activeTasks.length === 0 && status !== 'LoadingFirstPage' && (
					<div className="text-muted-foreground text-center py-8">No active tasks.</div>
				)}
				{status === 'LoadingFirstPage' && <Loading />}
				{status === 'LoadingMore' && (
					<div className="flex justify-center pt-4">
						<Loading />
					</div>
				)}
			</div>
		</div>
	);
}
