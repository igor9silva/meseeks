import { Link } from '@tanstack/react-router';
import { Doc, Id } from 'convex/_generated/dataModel';
import { asDollars } from 'convex/lib/money';
import { ArrowDown, ArrowUp, Clock, ExternalLink, RefreshCw, Wallet } from 'lucide-react';
import { TimeAgo } from '~/components/TimeAgo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

interface TransactionItemProps {
	transaction: Doc<'transactions'>;
	taskId?: Id<'tasks'>;
}

export function TransactionItem({ transaction, taskId }: TransactionItemProps) {
	//
	return (
		<div className="flex items-center justify-between gap-1 rounded-xl border bg-card p-3 transition-all hover:shadow-sm">
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
								<span className="ml-1">⚡</span>
							</TooltipTrigger>
							<TooltipContent>
								<span className="font-semibold">
									{asDollars({ bigInt: transaction.value.amount, precision: 6 })}
								</span>{' '}
								<strong>Energy</strong>, US Dollar-equivalent credits.
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
							<span className="hidden md:block">See task</span>
							<span className="md:hidden">Task</span>
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

function TransactionKind({ transaction }: { transaction: Doc<'transactions'> }) {
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
			return <h3 className="font-medium">Added energy to task</h3>;
		case 'refund from task':
			return <h3 className="font-medium">Refunded unused funds from task</h3>;
		default:
			return <h3 className="font-medium">Unknown</h3>;
	}
}
