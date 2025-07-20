import { z } from 'zod';
import { internal } from '../../_generated/api';
import { asDollars } from '../../lib/money';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const decreaseBudget = defineSkill({
	preApprovedCost: 'none',
	description: 'Remove energy from the task.',
	parameters: z.object({
		amount: z.bigint().min(0n).describe('The amount of funds to remove, in energy.'),
	}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			try {
				await execution.ctx.runMutation(internal.tasks.private._removeFunds, {
					taskId: execution.task._id,
					amount: args.amount,
				});

				return {
					text: `decreased energy by ${asDollars({ bigInt: args.amount })}`,
					reactions: [],
				};
				//
			} catch (error) {
				// perform() will resolve as failed with that message
				throw new Error('Failed to remove energy from task.');
			}
		},
});
