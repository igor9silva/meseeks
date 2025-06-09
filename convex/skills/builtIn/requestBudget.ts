import { z } from 'zod';
import { asBigInt } from '../../utils/money';
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
				text: `This task needs more budget to continue. Tap below. \n\n<AddBudgetButton />`,
				reactions: [],
			};
		},
});
