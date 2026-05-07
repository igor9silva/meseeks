import { z } from 'zod/v3';
import { internal } from 'convex/_generated/api';
import { asDollars } from 'lib/money';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const increaseBudget = defineSkill({
	preApprovedCost: 'none',
	description: 'Increase the energy budget of the task.',
	parameters: z.object({
		amount: z.bigint().min(0n).describe('The amount of funds to add, in energy.'),
		shouldIterate: z.boolean().optional().default(true).describe('Whether to react with iterate() or not.'),
	}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			const instruct = {
				skillKey: 'instruct' as const,
				args: {},
				condition: 'owner' as const,
			};

			try {
				await execution.ctx.runMutation(internal.tasks._increaseBudget, {
					taskId: execution.task._id,
					amount: args.amount,
				});

				return {
					text: `energy budget increased by ${asDollars({ bigInt: args.amount })}`,
					reactions: args.shouldIterate ? [instruct] : [],
				};
				//
			} catch {
				// perform() will resolve as failed with that message
				throw new Error('Insufficient account funds to increase task energy.');
			}
		},
});
