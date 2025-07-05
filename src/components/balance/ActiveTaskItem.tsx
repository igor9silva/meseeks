import { Link } from '@tanstack/react-router';
import { Doc } from 'convex/_generated/dataModel';
import { asDollars } from 'convex/lib/money';
import { DollarSign } from 'lucide-react';
import { TimeAgo } from '~/components/TimeAgo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';

interface ActiveTaskItemProps {
	task: Doc<'tasks'>;
}

export function ActiveTaskItem({ task }: ActiveTaskItemProps) {
	//
	const availableBudget = task.energyBudget.available;
	const totalBudget = task.energyBudget.total;
	const spentBudget = totalBudget - availableBudget;

	return (
		<Link
			to="/$"
			params={{ _splat: `/task/${task._id}` }}
			className="flex items-center justify-between rounded-lg border bg-card p-3 transition-all hover:shadow-sm hover:bg-accent/50 cursor-pointer"
		>
			<div className="flex items-center gap-3 flex-1 min-w-0">
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex-shrink-0">
					<DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div className="flex flex-col gap-0.5 flex-1 min-w-0">
					<h3 className={`font-medium truncate text-sm ${!task.title ? 'text-muted-foreground' : ''}`}>
						{task.title || 'Untitled task'}
					</h3>
					<span className="text-xs text-muted-foreground">
						<TimeAgo date={task._creationTime} />
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2 flex-shrink-0">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger>
							<span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
								{asDollars({ bigInt: availableBudget })}
								<span className="ml-1">⚡</span>
							</span>
						</TooltipTrigger>
						<TooltipContent>
							<div className="text-sm">
								<div>
									Available:{' '}
									<span className="font-semibold">
										{asDollars({ bigInt: availableBudget, precision: 6 })}
									</span>
								</div>
								<div>
									Total:{' '}
									<span className="font-semibold">
										{asDollars({ bigInt: totalBudget, precision: 6 })}
									</span>
								</div>
								<div>
									Spent:{' '}
									<span className="font-semibold">
										{asDollars({ bigInt: spentBudget, precision: 6 })}
									</span>
								</div>
							</div>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</Link>
	);
}
