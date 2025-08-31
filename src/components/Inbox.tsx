import { Link } from '@tanstack/react-router';
import { useRef } from 'react';
import { Loading } from '~/components/Loading';
import { TaskItem } from '~/components/TaskItem';
import { useInfiniteScroll } from '~/hooks/useInfiniteScroll';
import { usePaginatedSubtasks } from '~/hooks/useSuspensePaginatedQuery';

const PAGE_SIZE = 50;
const THRESHOLD = 0.5;

// Unified TaskList component used by both Inbox and Task components
export function TaskList({
	parentTaskId = 'inbox',
	currentTaskId,
	className,
}: {
	parentTaskId?: string | 'inbox';
	currentTaskId?: string;
	className?: string;
}) {
	//
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const { subtasks, loadMore, hasMore, isLoadingMore, isLoadingFirstPage } = usePaginatedSubtasks({
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
			{!isLoadingFirstPage && (
				<>
					{subtasks.map((task) => (
						<Link
							key={task._id}
							to="/$"
							params={{ _splat: `/task/${task._id}` }}
							resetScroll={false}
							className="block min-w-0"
						>
							<TaskItem task={task} className={currentTaskId === task._id ? 'bg-muted' : undefined} />
						</Link>
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
