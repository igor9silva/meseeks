import { z } from 'zod';
import { internal } from '../../_generated/api';
import { Id } from '../../_generated/dataModel';
import { messageFrom } from '../../lib/errors';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const cancelSchedule = defineSkill({
	preApprovedCost: 0n,
	description: 'Cancel an existing schedule',
	parameters: z.object({
		scheduleId: z.string().describe('The ID of the schedule to cancel'),
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
			try {
				//
				await execution.ctx.runMutation(internal.schedules.private._cancel, {
					scheduleId: args.scheduleId as Id<'schedules'>,
				});

				return {
					reactions: execution.skill.knownReactions,
				};
				//
			} catch (error) {
				//
				throw new Error(messageFrom(error));
			}
		},
});
