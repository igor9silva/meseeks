import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internal } from 'convex/_generated/api';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const moveTask = defineSkill({
	preApprovedCost: 'none',
	description: 'Move the task to a new parent',
	parameters: z.object({
		taskId: zid('tasks').describe('The task id to be moved.'),
		newParentId: z
			.union([zid('tasks'), z.literal('inbox')])
			.describe(
				'The new parent id for the task. Use "inbox" to move the task to the Inbox (aka root, no parent).',
			),
	}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			await execution.ctx.runMutation(internal.tasks._move, {
				taskId: args.taskId,
				newParentId: args.newParentId === 'inbox' ? undefined : args.newParentId,
			});

			return {
				reactions: execution.skill.knownReactions,
			};
		},
});
