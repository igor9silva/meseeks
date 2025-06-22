import { z } from 'zod';
import { asBigInt } from '../../lib/money';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const requestBudget = defineSkill({
	//
	preApprovedCost: asBigInt({ dollars: 0.01 }),
	description: 'Request budget increase for the task',
	parameters: z.object({
		estimatedCost: z.bigint().describe('The estimated cost for the failed action, in USDc'),
		previousActionKey: z.string().describe('The key of the previous action that failed'),
	}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			return {
				text: `This task needs more budget to continue.\n\n<div className="flex flex-row gap-2"><AddBudgetButton variant="secondary" amount={0.2} /><AddBudgetButton variant="secondary" amount={1} /><AddCustomBudgetButton variant="secondary" text="Any amount" /></div>`,
				reactions: [],
			};
		},
});
