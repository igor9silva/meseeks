import { Doc } from 'convex/_generated/dataModel';
import { asDollars } from 'lib/money';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { cn } from '@reactor/ui/lib/utils';

export function TaskBudget({
	task, //
	className,
	precision = 3,
	showColors = true,
	showSpent = false,
	showTooltip = true,
}: {
	task: Doc<'tasks'>;
	className?: string;
	precision?: number;
	showColors?: boolean;
	showSpent?: boolean;
	showTooltip?: boolean;
}) {
	//
	const available = task.energyBudget.available;
	const total = task.energyBudget.total;
	const spent = total - available;
	const percentSpent = total > BigInt('0') ? Number((spent * BigInt('100')) / total) : 0;
	const trigger = (
		<div
			className={cn(
				'flex flex-col items-end text-right whitespace-nowrap text-sm',
				showTooltip && 'cursor-help',
				className,
			)}
		>
			{task.isActive ? (
				<TriggerActive
					available={available}
					total={total}
					percentSpent={percentSpent}
					precision={precision}
					showColors={showColors}
				/>
			) : (
				<TriggerClosed spent={spent} precision={precision} showSpent={showSpent} />
			)}
		</div>
	);

	if (!showTooltip) return trigger;

	return (
		<TooltipProvider>
			<Tooltip renderAsDrawerOnMobile={true}>
				<TooltipTrigger asChild>{trigger}</TooltipTrigger>
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

function TriggerActive(props: {
	available: bigint;
	total: bigint;
	percentSpent: number;
	precision: number;
	showColors: boolean;
}) {
	//
	const { available, total, percentSpent, showColors, precision } = props;

	const color = (() => {
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
	})();

	return (
		<div className="flex flex-col">
			<div className="flex items-center" style={{ color }}>
				<span className="text-[0.6rem]">⚡</span>
				<div className="flex items-baseline">
					<span className="font-medium">{asDollars({ bigInt: available, precision })}</span>
					<span className="text-xs opacity-50">/{asDollars({ bigInt: total, precision })}</span>
				</div>
			</div>
		</div>
	);
}

function TriggerClosed({ spent, precision, showSpent }: { spent: bigint; precision: number; showSpent: boolean }) {
	return (
		<div className="text-muted-foreground font-medium flex items-center">
			<span className="text-[0.6rem]">⚡</span>
			{asDollars({ bigInt: spent, precision })} {showSpent && ' spent'}
		</div>
	);
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
