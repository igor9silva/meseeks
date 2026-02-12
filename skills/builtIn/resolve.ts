import { z } from 'zod';
import { internal } from 'convex/_generated/api';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const resolve = defineSkill({
	preApprovedCost: 'none',
	description: 'Mark the task as done, and learn!',
	parameters: z.object({
		reasoning: z.string().optional().describe('A short explanation for resolving the task.'),
	}),
	knownReactions: [
		// {
		// 	skillKey: 'learn',
		// 	args: {},
		// 	condition: 'any',
		// },
	],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			await execution.ctx.runMutation(internal.tasks._setStatus, {
				taskId: execution.task._id,
				newStatus: 'done',
			});

			return {
				text: args.reasoning ?? undefined,
				reactions: execution.skill.knownReactions,
			};
		},
});
