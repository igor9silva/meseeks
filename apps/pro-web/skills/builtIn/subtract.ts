import { z } from 'zod/v3';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const subtract = defineSkill({
	preApprovedCost: 0n,
	description: 'Subtract a number from another number',
	parameters: z.object({
		from: z.number().describe('The number to subtract from.'),
		amount: z.number().describe('The amount to subtract.'),
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
				text: `${args.from} - ${args.amount} = ${args.from - args.amount}`,
				reactions: execution.skill.knownReactions,
			};
		},
});
