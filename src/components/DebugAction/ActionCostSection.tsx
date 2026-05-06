import type { Doc } from 'convex/_generated/dataModel';
import { asDollars } from 'lib/money';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export function CostSection({ action }: { action: Doc<'actions'> }) {
	//
	const maxCost = action.maxCost ?? action.estimatedCost;
	const hasMaxCost = typeof maxCost === 'bigint';
	const hasActualCosts = 'costs' in action && action.costs && action.costs.length > 0;

	if (!hasMaxCost && !hasActualCosts) return null;

	const [isOpen, setIsOpen] = useState(false);
	const maxAmount = typeof maxCost === 'bigint' ? maxCost : 0n;
	const actualTotal = hasActualCosts ? action.costs.reduce((total, cost) => total + cost.amount, 0n) : 0n;

	return (
		<div className="space-y-3">
			{hasActualCosts && (
				<div>
					<CostHeader
						isOpen={isOpen}
						onClick={() => setIsOpen(!isOpen)}
						title={`Cost Breakdown $${asDollars({ bigInt: actualTotal, precision: 6 })}`}
						summary={<CostSummary actualTotal={actualTotal} maxAmount={maxAmount} />}
					/>
					{isOpen && (
						<div className="bg-muted border rounded-lg p-3 space-y-1 text-sm">
							{action.costs.map((cost, index) => (
								<div key={index} className="flex justify-between">
									<span>{cost.description}</span>
									<span className="font-mono">
										${asDollars({ bigInt: cost.amount, precision: 6 })} energy
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{hasMaxCost && !hasActualCosts && (
				<div>
					<CostHeader
						isOpen={isOpen}
						onClick={() => setIsOpen(!isOpen)}
						title="Max Cost"
						summary={<>(${asDollars({ bigInt: maxAmount, precision: 6 })})</>}
					/>
					{isOpen && (
						<div className="bg-muted border rounded-lg p-3 text-sm">
							<div className="flex justify-between">
								<span>Max:</span>
								<span className="font-mono">
									${asDollars({ bigInt: maxAmount, precision: 6 })} energy
								</span>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function CostHeader({
	isOpen,
	onClick,
	title,
	summary,
}: {
	isOpen: boolean;
	onClick: () => void;
	title: string;
	summary: ReactNode;
}) {
	//
	return (
		<div
			className="flex items-baseline gap-2 text-sm font-medium mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
			onClick={onClick}
		>
			{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
			{title}
			<span className="text-muted-foreground font-normal text-xs">{summary}</span>
		</div>
	);
}

function CostSummary({ actualTotal, maxAmount }: { actualTotal: bigint; maxAmount: bigint }) {
	//
	if (actualTotal === maxAmount) return <>(matched max)</>;

	if (maxAmount <= 0n) return <>(from ${asDollars({ bigInt: maxAmount, precision: 6 })} max)</>;

	const actualFloat = Number(actualTotal) / 1000000;
	const maxFloat = Number(maxAmount) / 1000000;
	const percentDiff = Math.abs(((actualFloat - maxFloat) / maxFloat) * 100);
	const isLess = actualTotal < maxAmount;

	return (
		<>
			({percentDiff.toFixed(0)}% {isLess ? 'less' : 'greater'} than $
			{asDollars({ bigInt: maxAmount, precision: 6 })} max)
		</>
	);
}
