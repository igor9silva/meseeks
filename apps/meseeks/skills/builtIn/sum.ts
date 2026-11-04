import { z } from 'zod';
import { defineSkill, ExecutionResult } from '../defineSkill';

export const sum = defineSkill({
	preApprovedCost: 0n,
	description: 'Sum N numbers',
	parameters: z.object({
		numbers: z.array(z.number()).describe('The numbers to sum.'),
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
				text: `${args.numbers.join(' + ')} = ${args.numbers.reduce((acc, curr) => acc + curr, 0)}`,
				reactions: execution.skill.knownReactions,
			};
		},
});
