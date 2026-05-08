import { z } from 'zod/v3';
import { internal } from 'convex/_generated/api';
import { zid } from 'convex-helpers/server/zod3';
import { messageFrom } from 'lib/errors';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const cancelSchedule = defineSkill({
	preApprovedCost: 0n,
	description: 'Cancel an existing schedule.',
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
				await execution.ctx.runMutation(internal.schedules._cancel, {
					scheduleId: zid('schedules').parse(args.scheduleId),
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
