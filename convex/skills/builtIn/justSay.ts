import { z } from 'zod';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const justSay = defineSkill({
	preApprovedCost: 0n,
	description: 'Send a text message',
	parameters: z.object({
		message: z.string().describe('The message in MDX format.'),
	}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			return {
				text: args.message,
				reactions: execution.skill.knownReactions,
			};
		},
});
