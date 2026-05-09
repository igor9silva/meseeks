import { z } from 'zod/v3';
import { asBigInt } from 'lib/money';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const requestBudget = defineSkill({
	//
	preApprovedCost: asBigInt({ dollars: 0.01 }),
	description: 'Request energy increase for the task.',
	parameters: z.object({
		maxCost: z.bigint().describe('The max cost for the failed action, in energy'),
		previousActionKey: z.string().describe('The key of the previous action that failed'),
	}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			console.debug('requesting task budget increase', {
				taskId: execution.task._id,
				actionId: execution.action._id,
				maxCost: args.maxCost.toString(),
				previousActionKey: args.previousActionKey,
			});

			return {
				text: `This task needs more energy to continue.\n\n<div className="flex flex-row gap-2"><AddBudgetButton variant="secondary" amount={0.2} /><AddBudgetButton variant="secondary" amount={1} /><AddCustomBudgetButton variant="secondary" text="Any amount" /></div>`,
				reactions: [],
			};
		},
});
