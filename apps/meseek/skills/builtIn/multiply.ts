import { z } from 'zod/v3';
import { defineSkill, ExecutionResult } from '../defineSkill';

export const multiply = defineSkill({
	preApprovedCost: 0n,
	description: 'Multiply N numbers. ***NOTE: the numbers must be passed as a NUMBER ARRAY - DO NOT USE STRINGS***',
	parameters: z.object({
		numbers: z.array(z.number()).describe('The numbers to multiply.'),
	}),
	knownReactions: [
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
				text: `${args.numbers.join(' * ')} = ${args.numbers.reduce((acc, curr) => acc * curr, 1)}`,
				reactions: execution.skill.knownReactions,
			};
		},
});
