import { useDebouncedValue } from '@reactor/ui/hooks/pacer';
import { usePaginatedQuery } from 'convex/react';
import { RefObject } from 'react';
import { Loading } from '~/components/Loading';
import { useInfiniteScroll } from '@reactor/ui/hooks/useInfiniteScroll';
import { TransactionItem } from './TransactionItem';
import { api } from 'convex/_generated/api';

const PAGE_SIZE = 50;

interface TransactionsTabProps {
	scrollContainerRef: RefObject<HTMLElement | null>;
}

export function TransactionsTab({ scrollContainerRef }: TransactionsTabProps) {
	//
	const [debouncedSearchTerm] = useDebouncedValue('', { wait: 300 });

	const {
		results: transactions,
		loadMore,
		status,
	} = usePaginatedQuery(
		api.transactions.findAllPaginated,
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
					<TransactionItem key={transaction._id} transaction={transaction} />
				))}
				{transactions.length === 0 && status !== 'LoadingFirstPage' && (
					<div className="text-muted-foreground text-center py-8">
						{debouncedSearchTerm ? 'No transactions match your search criteria.' : 'No transactions yet.'}
					</div>
				)}
				{status === 'LoadingFirstPage' && <Loading className="mt-5" />}
				{status === 'LoadingMore' && (
					<div className="flex justify-center pt-4">
						<Loading className="mt-4" />
					</div>
				)}
			</div>
		</div>
	);
}
