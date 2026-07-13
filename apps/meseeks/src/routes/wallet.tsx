import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { usePaginatedQuery } from 'convex/react';
import { ArrowDown, ArrowUp, ExternalLink, Wallet } from 'lucide-react';
import { useCallback, useRef } from 'react';
import { z } from 'zod/v3';
import { TopUpSection } from '~/components/balance/TopUpSection';
import { EnergyTooltip } from '~/components/EnergyTooltip';
import { Loading } from '~/components/Loading';
import { TimeAgo } from '~/components/TimeAgo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@pro/ui/tabs';
import { useLockedBalance } from '~/hooks/query/useTransactions';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { useIsPro } from '~/hooks/useIsPro';
import type { FileView } from '~/hooks/query/useFile';
import { cn } from '@pro/ui/lib/utils';
import { api } from 'convex/_generated/api';
import type { Doc } from 'convex/_generated/dataModel';
import { asDollars } from 'lib/money';

const searchSchema = z.object({
	tab: z.enum(['transactions', 'active-files']).optional(),
});

const PAGE_SIZE = 50;

export const Route = createFileRoute('/wallet')({
	component: RouteComponent,
	validateSearch: searchSchema,
});

function RouteComponent() {
	//
	const user = useCurrentUser();
	const navigate = useNavigate();
	const { tab } = Route.useSearch();
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const { lockedBalance } = useLockedBalance();
	const { isPro } = useIsPro();
	const currentTab = tab || 'transactions';
	const spendable = user.spendableBalanceUSD;

	const handleTabChange = useCallback(
		(value: string) => {
			const nextTab = value === 'transactions' ? undefined : 'active-files';
			navigate({
				to: '/wallet',
				search: { tab: nextTab },
				replace: true,
			});
		},
		[navigate],
	);

	return (
		<div ref={scrollContainerRef} className="flex h-full flex-col gap-4 overflow-y-auto p-4">
			<Link to="." search={{ tab: 'active-files' }}>
				<div className="flex flex-col gap-0">
					<h1 className="text-2xl font-bold">Wallet</h1>
					<span>
						Your current spendable balance is{' '}
						<EnergyTooltip>
							<span className="font-bold">{asDollars({ bigInt: spendable, precision: 6 })}⚡</span>
						</EnergyTooltip>
						.
					</span>
					{lockedBalance > 0n && (
						<span>
							Other{' '}
							<EnergyTooltip>
								<span className="font-bold">
									{asDollars({ bigInt: lockedBalance, precision: 6 })}⚡
								</span>
							</EnergyTooltip>{' '}
							committed to active files.
						</span>
					)}
				</div>
			</Link>

			<TopUpSection isPro={isPro} user={user} />

			<Tabs value={currentTab} onValueChange={handleTabChange} className="flex flex-1 flex-col">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="transactions">Transactions</TabsTrigger>
					<TabsTrigger value="active-files">Files locking energy</TabsTrigger>
				</TabsList>

				<TabsContent value="transactions" className="mt-4 flex-1">
					<TransactionsTab />
				</TabsContent>

				<TabsContent value="active-files" className="mt-4 flex-1">
					<ActiveBudgetsTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function TransactionsTab() {
	//
	const {
		results: transactions,
		loadMore,
		status,
	} = usePaginatedQuery(api.transactions.findAllPaginated, {}, { initialNumItems: PAGE_SIZE });

	return (
		<div className="flex flex-col gap-2">
			{transactions.map((transaction) => (
				<TransactionItem key={transaction._id} transaction={transaction} />
			))}
			{transactions.length === 0 && status !== 'LoadingFirstPage' && (
				<div className="py-8 text-center text-muted-foreground">No transactions yet.</div>
			)}
			{status === 'LoadingFirstPage' && <Loading className="mt-5" />}
			{status === 'CanLoadMore' && (
				<button
					type="button"
					className="rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
					onClick={() => loadMore(PAGE_SIZE)}
				>
					Load more
				</button>
			)}
			{status === 'LoadingMore' && <Loading className="mt-4" />}
		</div>
	);
}

function ActiveBudgetsTab() {
	//
	const {
		results: files,
		loadMore,
		status,
	} = usePaginatedQuery(api.fileViews.findAllPaginated, {}, { initialNumItems: PAGE_SIZE });
	const activeBudgets = files.filter((file) => file.energyBudget.available > 0n || file.energyBudget.reserved > 0n);

	return (
		<div className="flex flex-col gap-2">
			{activeBudgets.map((file) => (
				<ActiveBudgetItem key={file._id} file={file} />
			))}
			{activeBudgets.length === 0 && status !== 'LoadingFirstPage' && (
				<div className="py-8 text-center text-muted-foreground">No files are locking energy.</div>
			)}
			{status === 'LoadingFirstPage' && <Loading className="mt-4" />}
			{status === 'CanLoadMore' && (
				<button
					type="button"
					className="rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
					onClick={() => loadMore(PAGE_SIZE)}
				>
					Load more
				</button>
			)}
			{status === 'LoadingMore' && <Loading className="mt-4" />}
		</div>
	);
}

function TransactionItem({ transaction }: { transaction: Doc<'transactions'> }) {
	//
	const amount = transaction.value.amount;
	const isCredit = amount >= 0n;

	return (
		<div className="flex items-center justify-between gap-2 rounded-3xl border bg-card p-3 transition-all hover:bg-accent/40 hover:shadow-sm">
			<div className="flex min-w-0 items-center gap-3">
				<div
					className={cn(
						'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
						isCredit ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-gray-100 dark:bg-gray-950/30',
					)}
				>
					{isCredit ? (
						<ArrowUp className="size-5 text-emerald-500" />
					) : (
						<ArrowDown className="size-5 text-gray-500" />
					)}
				</div>
				<div className="min-w-0">
					<span className="text-sm text-muted-foreground">
						<TimeAgo date={transaction.createdAt} />
					</span>
					<h3 className="truncate font-medium">{transaction.description}</h3>
				</div>
			</div>
			<div className="flex flex-shrink-0 flex-col items-end gap-1">
				<span className={cn('font-medium', isCredit ? 'text-emerald-500' : 'text-gray-300')}>
					{asDollars({ bigInt: amount })}
					<span className="ml-1">⚡</span>
				</span>
				<TransactionLinks transaction={transaction} />
			</div>
		</div>
	);
}

function TransactionLinks({ transaction }: { transaction: Doc<'transactions'> }) {
	//
	const file = transaction.kind === 'action settlement' ? transaction.file : undefined;
	if (!file) return null;

	return (
		<Link
			to="/$"
			params={{ _splat: `tasks/${file}` }}
			className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
		>
			<span className="hidden md:block">See file</span>
			<span className="md:hidden">File</span>
			<ExternalLink className="size-3" />
		</Link>
	);
}

function ActiveBudgetItem({ file }: { file: FileView }) {
	//
	const available = file.energyBudget.available;
	const reserved = file.energyBudget.reserved;
	const total = file.energyBudget.total;

	return (
		<Link
			to="/$"
			params={{ _splat: `tasks/${file._id}` }}
			className="flex items-start justify-between gap-3 rounded-3xl border bg-card p-3 transition-all hover:bg-accent/50 hover:shadow-sm"
		>
			<div className="flex min-w-0 flex-1 items-start gap-3">
				<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30">
					<Wallet className="size-5 text-emerald-500" />
				</div>
				<div className="min-w-0 flex-1">
					<span className="text-sm text-muted-foreground">
						<TimeAgo date={file._creationTime} />
					</span>
					<h3
						className={cn(
							'line-clamp-2 text-sm font-medium leading-tight',
							!file.name && 'text-muted-foreground',
						)}
					>
						{file.name || 'Untitled file'}
					</h3>
				</div>
			</div>
			<div className="flex flex-shrink-0 flex-col items-end text-sm">
				<span className="font-medium text-emerald-500">
					{asDollars({ bigInt: available })}
					<span className="ml-1">⚡</span>
				</span>
				<span className="text-xs text-muted-foreground">
					{reserved > 0n
						? `${asDollars({ bigInt: reserved })} reserved`
						: `${asDollars({ bigInt: total })} total`}
				</span>
			</div>
		</Link>
	);
}
