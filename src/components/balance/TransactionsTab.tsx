import { api } from 'convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { RefObject, useEffect, useState } from 'react';
import { Loading } from '~/components/Loading';
import { useInfiniteScroll } from '~/hooks/useInfiniteScroll';
import { TransactionItem } from './TransactionItem';

const PAGE_SIZE = 50;

interface TransactionsTabProps {
	scrollContainerRef: RefObject<HTMLElement>;
}

export function TransactionsTab({ scrollContainerRef }: TransactionsTabProps) {
	//
	const [searchTerm, setSearchTerm] = useState('');
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

	// Debounce search term
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchTerm]);

	const {
		results: transactions,
		loadMore,
		status,
	} = usePaginatedQuery(
		api.transactions.public.findAllPaginated,
		{ search: debouncedSearchTerm || undefined },
		{ initialNumItems: PAGE_SIZE },
	);

	useInfiniteScroll({
		loadMore,
		hasMore: status === 'CanLoadMore',
		isLoading: status === 'LoadingMore' || status === 'LoadingFirstPage',
		scrollContainerRef,
		pageSize: PAGE_SIZE,
	});

	return (
		<div className="flex flex-col gap-4">
			{/* Search Controls */}
			{/* <div className="flex gap-2 items-center">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search transactions..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div> */}

			{/* Transactions List */}
			<div className="space-y-2">
				{transactions.map((transaction) => (
					<TransactionItem
						key={transaction._id}
						transaction={transaction}
						taskId={
							transaction.kind === 'fund task' || transaction.kind === 'refund from task'
								? transaction.taskId
								: undefined
						}
					/>
				))}
				{transactions.length === 0 && status !== 'LoadingFirstPage' && (
					<div className="text-muted-foreground text-center py-8">
						{debouncedSearchTerm ? 'No transactions match your search criteria.' : 'No transactions yet.'}
					</div>
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
