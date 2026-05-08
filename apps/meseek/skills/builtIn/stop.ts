import { z } from 'zod/v3';
import { defineSkill, ExecutionResult } from '../defineSkill';

export const stop = defineSkill({
	preApprovedCost: 0n,
	description: 'Stop the reaction chain.',
	parameters: z.object({}),
	knownReactions: [],
	use: (execution) => async (): Promise<ExecutionResult> => {
		//
		return {
			reactions: execution.skill.knownReactions,
		};
	},
});
