import type { Doc } from 'convex/_generated/dataModel';
import { Link } from '@tanstack/react-router';
import { asDollars } from 'lib/money';
import { Plus } from 'lucide-react';
import { TaskBudget } from '~/components/TaskBudget';
import { Button } from '~/components/ui/button';
import { useComposer } from '~/hooks/useComposer';

const QUICK_ADD_AMOUNTS = [
	0.2, //
	1,
] as const;

export function BudgetStrip({ task }: { task: Doc<'tasks'> }) {
	//
	const { enqueue } = useComposer();

	const handleQuickAdd = (dollars: number) => {
		//
		// store dollars as number - converted to bigint in useComposer submit
		enqueue({
			skillKey: 'increaseBudget',
			args: { dollars },
			source: 'budget-strip',
		});
	};

	if (!task.isActive) {
		//
		const spent = task.energyBudget.total - task.energyBudget.available;
		return (
			<div className="flex items-center justify-between px-4 py-1.5 text-sm">
				<span className="text-muted-foreground">{asDollars({ bigInt: spent, precision: 2 })} spent</span>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-between px-4 py-1.5 text-sm">
			{/* budget display */}
			<TaskBudget task={task} precision={2} />

			{/* quick-add buttons */}
			<div className="flex items-center gap-1">
				{QUICK_ADD_AMOUNTS.map((amount) => (
					<Button
						key={amount}
						type="button"
						variant="ghost"
						size="sm"
						className="h-6 px-2 text-xs gap-1"
						onClick={() => handleQuickAdd(amount)}
					>
						<Plus className="size-3" />
						{amount.toFixed(2)} ⚡
					</Button>
				))}
				<Link to="." search={(prev) => ({ ...prev, isBudgetDrawerOpen: true })}>
					<Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-0">
						<Plus className="size-3" />
						Any ⚡
					</Button>
				</Link>
			</div>
		</div>
	);
}
