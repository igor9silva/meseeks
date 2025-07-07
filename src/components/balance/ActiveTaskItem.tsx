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
			className="flex items-center justify-between gap-1 rounded-xl border bg-card p-3 transition-all hover:shadow-sm hover:bg-accent/50 cursor-pointer"
		>
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30">
					<DollarSign className="size-5 text-emerald-500" />
				</div>
				<div className="flex flex-col gap-0.5">
					<span className="text-sm text-muted-foreground">
						<TimeAgo date={task._creationTime} />
					</span>
					<h3 className={`font-medium ${!task.title ? 'text-muted-foreground' : ''}`}>
						{task.title || 'Untitled task'}
					</h3>
				</div>
			</div>
			<div className="flex items-center">
				<span className="flex-shrink-0 font-medium text-emerald-500">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger>
								{asDollars({ bigInt: availableBudget })}
								<span className="ml-1">⚡</span>
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
				</span>
			</div>
		</Link>
	);
}
