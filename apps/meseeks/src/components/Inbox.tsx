import { useRef } from 'react';
import type { Id } from 'convex/_generated/dataModel';
import { Loading } from '~/components/Loading';
import { QuickSeek } from '~/components/QuickSeek';
import { TaskItem } from '~/components/TaskItem';
import { useInfiniteScroll } from '@reactor/ui/hooks/useInfiniteScroll';
import { usePaginatedSubtasks } from '~/hooks/useSuspensePaginatedQuery';

const PAGE_SIZE = 50;
const THRESHOLD = 0.5;

// Unified TaskList component used by both Inbox and Task components
export function TaskList({
	parentTaskId = 'inbox',
	currentTaskId,
	className,
}: {
	parentTaskId?: Id<'tasks'> | 'inbox';
	currentTaskId?: string;
	className?: string;
}) {
	//
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const parentId = parentTaskId === 'inbox' ? undefined : parentTaskId;

	const { subtasks, loadMore, hasMore, isLoadingMore, isLoadingFirstPage } = usePaginatedSubtasks({
		parentId,
		initialNumItems: PAGE_SIZE,
	});

	useInfiniteScroll({
		loadMore: (numItems) => loadMore(numItems),
		hasMore,
		isLoading: isLoadingMore,
		scrollContainerRef,
		pageSize: PAGE_SIZE,
		threshold: THRESHOLD,
	});

	return (
		<div ref={scrollContainerRef} className={`overflow-auto h-full ${className || ''}`}>
			{/* Initial loading state */}
			{isLoadingFirstPage && <Loading className="mt-4" />}

			{/* Content */}
			{!isLoadingFirstPage && subtasks.length === 0 && parentTaskId === 'inbox' && <QuickSeek />}

			{!isLoadingFirstPage && subtasks.length > 0 && (
				<>
					{subtasks.map((task) => (
						<TaskItem
							key={task._id}
							task={task}
							className={currentTaskId === task._id ? 'bg-muted' : undefined}
						/>
					))}

					{/* Loading more indicator */}
					{isLoadingMore && (
						<div className="flex justify-center pt-4">
							<Loading className="mt-4" />
						</div>
					)}
				</>
			)}
		</div>
	);
}

export function Inbox() {
	//
	return <TaskList />;
}
