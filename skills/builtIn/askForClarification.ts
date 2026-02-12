import { z } from 'zod';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const askForClarification = defineSkill({
	preApprovedCost: 0n,
	description:
		'Before executing a task, make sure you are at least 80% sure of the user intention for the task. Use this tool to ask for user clarification.',
	parameters: z.object({
		message: z.string().describe('The message to send to the user in MDX format.'),
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
