import { z } from 'zod';
import { defineSkill, ExecutionResult } from '../defineSkill';

export const say = defineSkill({
	preApprovedCost: 0n,
	description: 'Sends a text message.',
	parameters: z.object({
		message: z.string().describe('The message in MDX format.'),
	}),
	knownReactions: [
		{
			skillKey: 'instruct',
			args: {},
			condition: 'owner',
		},
		{
			skillKey: 'iterate',
			args: {},
			condition: 'companion',
		},
	],
	use:
		(execution) =>
		async (args): Promise<ExecutionResult> => {
			//
			return {
				text: args.message,
				reactions: execution.skill.knownReactions,
			};
		},
	priority: 0,
});
