import { z } from 'zod/v3';
import { internal } from 'convex/_generated/api';
import { asDollars } from 'lib/money';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const decreaseBudget = defineSkill({
	preApprovedCost: 'none',
	description: 'Decrease the task energy policy.',
	parameters: z.object({
		amount: z.bigint().min(0n).describe('The amount of task energy policy to remove.'),
	}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			try {
				await execution.ctx.runMutation(internal.tasks._decreaseBudget, {
					taskId: execution.task._id,
					amount: args.amount,
				});

				return {
					text: `task energy decreased by ${asDollars({ bigInt: args.amount })}`,
					reactions: [],
				};
				//
			} catch (error) {
				// perform() will resolve as failed with that message
				throw new Error('Failed to decrease task energy.');
			}
		},
});
