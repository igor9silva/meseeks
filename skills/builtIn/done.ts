import { z } from 'zod';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const done = defineSkill({
	preApprovedCost: 0n,
	description: 'Stop iterating.',
	parameters: z.object({
		message: z.string().optional().describe('An optional (final) message to the user. Max 100 characters.'),
		reason: z.enum([
			'resolved', //
			// 'running out of budget',
			'blocked',
		]),
	}),
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
