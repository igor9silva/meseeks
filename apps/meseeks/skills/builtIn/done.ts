import { z } from 'zod/v3';
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
			console.debug('done skill completed', {
				actionId: execution.action._id,
				reason: args.reason,
				hasMessage: Boolean(args.message),
			});

			return {
				reactions: execution.skill.knownReactions,
			};
		},
});
