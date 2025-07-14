import { Doc } from 'convex/_generated/dataModel';
import { asDollars } from 'convex/lib/money';
import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';

export function TaskBudget({
	task, //
	className,
	precision = 3,
	showColors = true,
}: {
	task: Doc<'tasks'>;
	className?: string;
	precision?: number;
	showColors?: boolean;
}) {
	//
	const available = task.energyBudget.available;
	const total = task.energyBudget.total;
	const spent = total - available;
	const percentSpent = total > 0n ? Number((spent * 100n) / total) : 0;

	return (
		<TooltipProvider delayDuration={250}>
			<Tooltip renderAsDrawerOnMobile={true}>
				<TooltipTrigger asChild>
					<div className={cn('flex flex-col items-end text-right whitespace-nowrap text-sm', className)}>
						{task.isActive ? (
							<TriggerActive
								available={available}
								percentSpent={percentSpent}
								precision={precision}
								showColors={showColors}
							/>
						) : (
							<TriggerClosed spent={spent} precision={precision} />
						)}
					</div>
				</TooltipTrigger>
				<TooltipContent side="bottom" align="end">
					{task.isActive ? (
						<TooltipActive total={total} available={available} spent={spent} percentSpent={percentSpent} />
					) : (
						<TooltipClosed spent={spent} />
					)}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function TriggerActive(props: { available: bigint; percentSpent: number; precision: number; showColors: boolean }) {
	//
	const { available, percentSpent, showColors, precision } = props;

	const color = useMemo(() => {
		//
		if (!showColors) return undefined;

		// Normalize percentage to 0-1 range, capped at 0.9 (90%)
		const normalizedPercent = Math.min(percentSpent / 90, 1);

		// RGB values for green (0, 192, 134) to red (239, 68, 68)
		const r = Math.round(0 + normalizedPercent * 239);
		const g = Math.round(192 - normalizedPercent * 124);
		const b = Math.round(134 - normalizedPercent * 66);

		return `rgb(${r}, ${g}, ${b})`;
		//
	}, [percentSpent, showColors]);

	return (
		<div className="flex flex-col">
			<div className="font-medium" style={{ color }}>
				${asDollars({ bigInt: available, precision })} remaining
			</div>
		</div>
	);
}

function TriggerClosed({ spent, precision }: { spent: bigint; precision: number }) {
	return <div className="text-muted-foreground font-medium">${asDollars({ bigInt: spent, precision })} spent</div>;
}

function TooltipActive(props: {
	spent: bigint; //
	available: bigint;
	total: bigint;
	percentSpent: number;
}) {
	const { spent, available, total, percentSpent } = props;

	return (
		<div className="text-base space-y-1">
			<p>
				Available <strong>{asDollars({ bigInt: available, precision: 6 })} ⚡</strong>
			</p>
			<p>
				Spent <strong>{asDollars({ bigInt: spent, precision: 6 })} ⚡</strong> ({percentSpent.toFixed(1)}
				%)
			</p>
			<p>
				Total added <strong>{asDollars({ bigInt: total, precision: 6 })} ⚡</strong>
			</p>
		</div>
	);
}

function TooltipClosed({ spent }: { spent: bigint }) {
	return (
		<p className="text-base">
			Total spent <strong>{asDollars({ bigInt: spent, precision: 6 })} ⚡</strong>
		</p>
	);
}
