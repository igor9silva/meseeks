import { z } from 'zod';
import { internal } from '../../_generated/api';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const setUserInfo = defineSkill({
	preApprovedCost: 0n,
	description:
		'Update the user information stored in preferences. Use this when the user explicitly asks you to remember something.',
	parameters: z.object({
		userInfo: z.string().describe('The updated user information as a text string'),
	}),
	knownReactions: [
		{
			skillKey: 'iterate',
			args: {},
			condition: 'companion',
		},
	],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			await execution.ctx.runMutation(internal.users.preferences.private._setUserPreference, {
				userId: execution.task.owner,
				key: 'userInfo',
				value: args.userInfo,
			});

			return {
				text: `✅ User information updated successfully.`,
				reactions: execution.skill.knownReactions,
			};
		},
});
