import { z } from 'zod';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const scheduledIteration = defineSkill({
	preApprovedCost: 0n,
	description:
		'Execute a scheduled iteration - this skill is automatically invoked when a previously scheduled time arrives.',
	parameters: z.object({
		scheduleType: z.enum(['one-time', 'recurring']).describe('Type of schedule that triggered this iteration'),
		instructions: z.string().optional().describe('Specific instructions for what to do when this schedule runs'),
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
			const scheduleTypeText = args.scheduleType === 'one-time' ? 'one-time' : 'recurring';

			// Create context message for the model - this will appear in message history
			let contextMessage = `A scheduled ${scheduleTypeText} iteration was previously set up to run at this time.`;

			if (args.instructions) {
				contextMessage += ` Instructions for this scheduled run: ${args.instructions}`;
			}

			contextMessage += ' Proceed with the task accordingly.';

			return {
				text: contextMessage,
				reactions: execution.skill.knownReactions,
			};
		},
});
