import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internal } from 'convex/_generated/api';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const moveTask = defineSkill({
	preApprovedCost: 'none',
	description: 'Move the task to a new parent',
	parameters: z.object({
		taskId: z.string().describe('The task id to be moved.'),
		newParentId: z
			.union([z.string(), z.literal('inbox')])
			.describe(
				'The new parent id for the task. Use "inbox" to move the task to the Inbox (aka root, no parent).',
			),
	}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			const taskId = zid('tasks').parse(args.taskId);
			const newParentId = args.newParentId === 'inbox' ? undefined : zid('tasks').parse(args.newParentId);

			await execution.ctx.runMutation(internal.tasks._move, {
				taskId,
				newParentId,
			});

			return {
				reactions: execution.skill.knownReactions,
			};
		},
});
