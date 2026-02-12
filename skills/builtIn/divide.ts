import { z } from 'zod';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const divide = defineSkill({
	preApprovedCost: 0n,
	description: 'Divide N numbers',
	parameters: z.object({
		A: z.number().describe('The dividend.'),
		B: z.number().describe('The divisor.'),
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
				text: `${args.A} / ${args.B} = ${args.A / args.B}`,
				reactions: execution.skill.knownReactions,
			};
		},
});
