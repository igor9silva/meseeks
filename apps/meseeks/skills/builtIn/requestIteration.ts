import { z } from 'zod/v3';
import { defineSkill, ExecutionResult } from '../defineSkill';

export const requestIteration = defineSkill({
	preApprovedCost: 0n,
	description: 'Request a new iteration of the task.',
	parameters: z.object({}),
	knownReactions: [
		{
			skillKey: 'instruct',
			args: {},
			condition: 'owner',
		},
	],
	use: (execution) => async (): Promise<ExecutionResult> => {
		//
		return {
			reactions: execution.skill.knownReactions,
		};
	},
});
