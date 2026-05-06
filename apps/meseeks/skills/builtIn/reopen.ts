import { z } from 'zod/v3';
import { internal } from 'convex/_generated/api';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const reopen = defineSkill({
	preApprovedCost: 'none',
	description: 'Re-open a task that was previously marked as done.',
	parameters: z.object({}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			await execution.ctx.runMutation(internal.tasks._setStatus, {
				taskId: execution.task._id,
				newStatus: 'idle',
			});

			return {
				reactions: execution.skill.knownReactions,
			};
		},
});
