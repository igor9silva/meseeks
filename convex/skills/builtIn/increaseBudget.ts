import { z } from 'zod';
import { internal } from '../../_generated/api';
import { asDollars } from '../../lib/money';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const increaseBudget = defineSkill({
	preApprovedCost: 'none',
	description: 'Increase the budget of the task',
	parameters: z.object({
		amount: z.bigint().min(0n).describe('The amount of funds to add, in USDc.'),
		shouldIterate: z.boolean().optional().default(true).describe('Whether to react with iterate() or not.'),
	}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			const iterate = {
				skillKey: 'iterate' as const,
				args: {},
				condition: 'owner' as const,
			};

			try {
				await execution.ctx.runMutation(internal.tasks.private._increaseBudget, {
					taskId: execution.task._id,
					amount: args.amount,
				});

				return {
					text: `budget increased by ${asDollars({ bigInt: args.amount })}`,
					reactions: args.shouldIterate ? [iterate] : [],
				};
				//
			} catch (error) {
				// perform() will resolve as failed with that message
				throw new Error('Insufficient account funds to increase budget.');
			}
		},
});
