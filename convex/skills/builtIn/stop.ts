import { z } from 'zod';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const stop = defineSkill({
	preApprovedCost: 0n,
	description: 'Stop the reaction chain.',
	parameters: z.object({}),
	knownReactions: [],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			return {
				reactions: execution.skill.knownReactions,
			};
		},
});
