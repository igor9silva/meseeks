import { format, isToday, isTomorrow } from 'date-fns';
import { z } from 'zod';
import { internal } from '../../_generated/api';
import { computeNextRun } from '../../schedules/cron';
import { timeZoneSchema } from '../../schemas/scheduleSchema';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const schedule = defineSkill({
	preApprovedCost: 0n,
	description:
		'Schedule a iteration to run at specific times. Once or repeatedly. For recurring schedules, you must provide a cron expression. For one-time schedules, you must provide a delay in seconds or an specific time.',
	parameters: z.object({
		scheduleType: z.enum(['one-time', 'recurring']).describe('Type of schedule'),
		timeZone: timeZoneSchema,
		delaySeconds: z
			.number()
			.optional()
			.describe(
				'Number of seconds from now to execute (**for one-time schedules only**). Example: `1800` for 30 minutes',
			),
		scheduledAt: z
			.string()
			.optional()
			.describe(
				'ISO8601 datetime string for when to execute (**for one-time schedules only**). Example: `2024-12-25T15:30:00Z`',
			),
		cronExpression: z
			.string()
			.optional()
			.describe(
				'Cron expression for recurring execution (**required for recurring schedules**). Example: "0 9 * * 1" for every Monday at 9 AM',
			),
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
			const skillKey = 'iterate';

			// Create the schedule (this handles all validation and business logic)
			await execution.ctx.runMutation(internal.schedules.private._create, {
				taskId: execution.task._id,
				owner: execution.task.owner,
				author: execution.action._id,
				skillKey,
				args: {},
				depth: execution.action.depth + 1,
				scheduleType: args.scheduleType,
				timeZone: args.timeZone,
				delaySeconds: args.delaySeconds,
				scheduledAt: args.scheduledAt,
				cronExpression: args.cronExpression,
			});

			// Generate response message
			if (args.scheduleType === 'one-time') {
				//
				let scheduledTimestamp: Date;
				if (args.delaySeconds) {
					scheduledTimestamp = new Date(Date.now() + args.delaySeconds * 1000);
				} else {
					scheduledTimestamp = new Date(args.scheduledAt!);
				}

				const description = formatScheduledTime(scheduledTimestamp);
				return {
					text: `📅 Scheduled to iterate ${description}`,
					reactions: execution.skill.knownReactions,
				};
				//
			} else {
				//
				const nextRun = computeNextRun(args.cronExpression!, args.timeZone);
				return {
					text: [
						`📅 Scheduled to iterate recurrently (rule ${args.cronExpression}).`,
						`Next run will be ${formatScheduledTime(nextRun)}`,
					].join(' '),
					reactions: execution.skill.knownReactions,
				};
			}
		},
});

// Helper function to format dates in a human-readable way
function formatScheduledTime(date: Date): string {
	//
	if (isToday(date)) {
		return `today at ${format(date, 'h:mm a')}`;
	}

	if (isTomorrow(date)) {
		return `tomorrow at ${format(date, 'h:mm a')}`;
	}

	return `at ${date.toLocaleString()}`;
}
