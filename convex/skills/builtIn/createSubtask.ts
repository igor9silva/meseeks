import { z } from 'zod';
import { internal } from '../../_generated/api';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const createSubtask = defineSkill({
	preApprovedCost: 'none',
	description: 'Create a subtask under the current task.',
	parameters: z.object({
		title: z.string().max(60).describe('A short title for the subtask. Max 60 characters.'),
		instructions: z
			.string()
			.optional()
			.describe(
				'Instructions for the subtask. Add details so another companion can handle it properly.',
			),
	}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			await execution.ctx.runMutation(internal.tasks.private._addWithActions, {
				parentId: execution.task._id,
				author: execution.action?._id ?? execution.task.owner,
				owner: execution.task.owner,
				title: args.title,
				instructions: args.instructions,
				skills: [],
			});

			return {
				reactions: execution.skill.knownReactions,
			};
		},
});
