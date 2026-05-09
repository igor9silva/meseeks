import { z } from 'zod/v3';
import { internal } from 'convex/_generated/api';
import { defineSkill, ExecutionResult } from '../defineSkill';

export const reopen = defineSkill({
	preApprovedCost: 'none',
	description: 'Re-open a task that was previously marked as done.',
	parameters: z.object({}),
	knownReactions: [],
	use: (execution) => async (): Promise<ExecutionResult> => {
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
