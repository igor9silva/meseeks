import { z } from 'zod';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const reason = defineSkill({
	preApprovedCost: 0n,
	description:
		'Reason (think to yourself - *not visible to the user*). Scientifically proven to increase the quality of the next action.',
	parameters: z.object({
		reasoning: z.string().describe('The reasoning in MDX format.'),
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
			return {
				text: args.reasoning,
				reactions: execution.skill.knownReactions,
			};
		},
});
