import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { Doc, Id } from 'convex/_generated/dataModel';
import { asBigInt, asDollars } from 'convex/utils/money';
import { AlertTriangle, ArrowDown, ArrowUp, Clock, ExternalLink, RefreshCw, Wallet } from 'lucide-react';
import { DollarCredits } from '~/components/DollarCredits';
import { TimeAgo } from '~/components/TimeAgo';
import { TopUpCard } from '~/components/TopUpCard';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { useIsPro } from '~/hooks/useIsPro';

export const Route = createFileRoute('/balance')({
	component: RouteComponent,
});

function RouteComponent() {
	//
	const query = convexQuery(api.transactions.public.findAll, {});
	const { data: transactions } = useSuspenseQuery(query);

	const user = useCurrentUser();

	const queryLockedBalance = convexQuery(api.users.public.findLockedBalance, {});
	const { data: lockedBalance } = useSuspenseQuery(queryLockedBalance);

	const { isPro } = useIsPro();

	return (
		<div className="flex flex-col gap-4 p-4">
			<div className="flex flex-col gap-0">
				<h1 className="text-2xl font-bold">Balance</h1>
				<span className="text-sm">
					Your current non-locked balance is{' '}
					<span className="font-bold">
						{asDollars({ bigInt: user.balanceUSD ?? 0n, precision: 6 })} <DollarCredits />
					</span>
					.
				</span>
				{lockedBalance > 0 && (
					<span className="text-sm">
						Other{' '}
						<span className="font-bold">
							{asDollars({ bigInt: lockedBalance, precision: 6 })} <DollarCredits /> are locked
						</span>{' '}
						in active tasks.
					</span>
				)}
			</div>

			<LowBalanceWarning balance={user.balanceUSD ?? 0n} />
			<TopUpSection isPro={isPro} />

			<div className="flex flex-col gap-2 mt-4">
				<h2 className="text-lg font-bold">Transactions</h2>
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
					{transactions.length === 0 && <div className="text-muted-foreground">No transactions yet.</div>}
				</div>
			</div>
		</div>
	);
}

function LowBalanceWarning({ balance }: { balance: bigint }) {
	//
	const MIN_SAFE_BALANCE = asBigInt({ dollars: 1 });

	if (balance >= MIN_SAFE_BALANCE) return null;

	return (
		<Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
			<CardContent className="flex items-center gap-3 p-4">
				<AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
				<div className="text-orange-800 dark:text-orange-200">
					Your funds are running low. Consider topping up.
				</div>
			</CardContent>
		</Card>
	);
}

function TopUpSection({ isPro }: { isPro: boolean }) {
	//
	if (!isPro) {
		return (
			<Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
				<CardContent className="flex items-center gap-3 p-4">
					<AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
					<div className="text-blue-800 dark:text-blue-200 flex items-center justify-between w-full">
						<div>
							You must be a <strong>Pro</strong> user to top up your account balance.
						</div>
						<Link to="/subscribe">
							<Button className="ml-4">Go Pro</Button>
						</Link>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-2">
			<h2 className="text-lg font-semibold">Top Up</h2>
			<TopUpCard />
		</div>
	);
}

function TransactionItem({
	transaction, //
	taskId,
}: {
	transaction: Doc<'transactions'>;
	taskId?: Id<'tasks'>;
}) {
	//
	return (
		<div className="flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:shadow-sm">
			<div className="flex items-center gap-3">
				<div
					className={`flex h-10 w-10 items-center justify-center rounded-full ${getTransactionBgColor(transaction)}`}
				>
					<TransactionIcon transaction={transaction} />
				</div>
				<div className="flex flex-col gap-0.5">
					<span className="text-sm text-muted-foreground">
						<TimeAgo date={transaction._creationTime} />
					</span>
					<TransactionKind transaction={transaction} />
				</div>
			</div>
			<div className="flex flex-col items-end gap-1">
				<span
					className={`flex-shrink-0 font-medium ${transaction.value.amount >= 0 ? 'text-emerald-500' : 'text-gray-200'}`}
				>
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger>
								{asDollars({ bigInt: transaction.value.amount })}
								<span className="ml-1">USDc</span>
							</TooltipTrigger>
							<TooltipContent>
								<span className="font-semibold">
									{asDollars({ bigInt: transaction.value.amount, precision: 6 })}
								</span>{' '}
								US Dollar-equivalent credits
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</span>

				<div className="mt-1 flex items-center gap-2">
					{taskId && (
						<Link
							to="/$"
							params={{ _splat: `/task/${taskId}` }}
							className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
						>
							See task
							<ExternalLink className="size-3" />
						</Link>
					)}
					{transaction.kind === 'top up' && transaction.topUpId && (
						<Link
							to="/$"
							params={{ _splat: `/top-up/${transaction.topUpId}` }}
							className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground"
						>
							Transaction details
							<ExternalLink className="size-3" />
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}

function getTransactionBgColor(transaction: Doc<'transactions'>): string {
	//
	switch (transaction.kind) {
		case 'free credits':
			return 'bg-indigo-100 dark:bg-indigo-950/30';
		case 'top up':
			return 'bg-emerald-100 dark:bg-emerald-950/30';
		case 'fund task':
			return 'bg-gray-100 dark:bg-gray-950/30';
		case 'refund from task':
			return 'bg-emerald-100 dark:bg-teal-950/30';
		default:
			return 'bg-muted';
	}
}

function TransactionIcon({ transaction }: { transaction: Doc<'transactions'> }) {
	//
	switch (transaction.kind) {
		case 'free credits':
			return <Wallet className="size-5 text-indigo-500" />;
		case 'top up':
			return <ArrowUp className="size-5 text-emerald-500" />;
		case 'fund task':
			return <ArrowDown className="size-5 text-gray-500" />;
		case 'refund from task':
			return <RefreshCw className="size-5 text-emerald-500" />;
		default:
			return <Clock className="size-5 text-gray-500" />;
	}
}

function TransactionKind({
	transaction, //
	taskId,
}: {
	transaction: Doc<'transactions'>;
	taskId?: Id<'tasks'>;
}) {
	//
	if (transaction.description) {
		return <h3 className="font-medium">{transaction.description}</h3>;
	}

	switch (transaction.kind) {
		case 'free credits':
			return <h3 className="font-medium">Free credits 🎉</h3>;
		case 'top up':
			return <h3 className="font-medium">Added funds to account</h3>;
		case 'fund task':
			return <h3 className="font-medium">Added budget to task</h3>;
		case 'refund from task':
			return <h3 className="font-medium">Refunded unused funds from task</h3>;
		default:
			return <h3 className="font-medium">Unknown</h3>;
	}
}
