import { z } from 'zod/v3';
import { asDollars } from 'lib/money';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const requestFunds = defineSkill({
	//
	preApprovedCost: 0n,
	description: 'Request account funds so the task can continue.',
	parameters: z.object({
		amount: z.bigint().describe('The account funds needed for the failed action.'),
		previousActionKey: z.string().describe('The key of the previous action that failed.'),
	}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			return {
				text: `Your account needs at least ${asDollars({ bigInt: args.amount, precision: 6 })} more energy to continue ${args.previousActionKey}.\n\n<TopUpCard />`,
				reactions: [],
			};
		},
});
