import type { Doc } from 'convex/_generated/dataModel';
import { asDollars } from 'lib/money';
import { AddCustomBudgetButton } from '~/components/AddBudgetButton';
import { TaskBudget } from '~/components/TaskBudget';

export function BudgetStrip({ task }: { task: Doc<'tasks'> }) {
	//
	return (
		<div className="flex items-center justify-between px-4 py-1.5 text-sm">
			<TaskBudget task={task} precision={2} showSpent={true} />
			<AddCustomBudgetButton variant="ghost" content="+⚡" />
		</div>
	);
}
