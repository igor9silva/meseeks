import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { Id } from '../_generated/dataModel';
import { MutationCtx } from '../_generated/server';
import { addAction, skipPendingAuthorizationByTaskAuthor } from '../action.private';
import { internal } from '../_generated/api';
import { defineMutation } from 'lib/convex';
import { computeNextRun } from 'lib/cron';
import { authorSchema } from 'schemas/authorSchema';
import { updateScheduleJobId, updateScheduleLastRun } from '../schedules.private';

export const executeOneTime = defineMutation({
	args: z.object({
		scheduleId: zid('schedules'),
		taskId: zid('tasks'),
		owner: zid('users'),
		author: authorSchema,
		skillKey: z.string(),
		args: z.record(z.unknown()),
		depth: z.number(),
	}),
	handler: async (ctx, { scheduleId, taskId, owner, author, skillKey, args, depth }) => {
		//
		await addAction(ctx, {
			taskId,
			owner,
			author,
			skillKey,
			args,
			depth,
		});

		await ctx.db.delete(scheduleId);
	},
});

export const executeRecurring = defineMutation({
	args: z.object({
		scheduleId: zid('schedules'),
		taskId: zid('tasks'),
		owner: zid('users'),
		author: authorSchema,
		skillKey: z.string(),
		args: z.record(z.unknown()),
		depth: z.number(),
		cronExpression: z.string(),
		timeZone: z.string(),
	}),
	handler: async (ctx, { scheduleId, taskId, owner, author, skillKey, args, depth, cronExpression, timeZone }) => {
		//
		await skipPendingAuthorizationByTaskAuthor(ctx, {
			taskId,
			author,
			reasonText: 'superseded by a newer scheduled run',
		});

		await addAction(ctx, {
			taskId,
			owner,
			author,
			skillKey,
			args,
			depth,
		});

		const nextRunAt = computeNextRun(cronExpression, timeZone);

		const scheduledJobId = await scheduleExecution(
			ctx,
			{
				taskId,
				owner,
				author,
				skillKey,
				args,
				depth,
				cronExpression,
				timeZone,
				scheduleType: 'recurring',
			},
			nextRunAt,
			scheduleId,
		);

		await updateScheduleJobId(ctx, {
			scheduleId,
			scheduledJobId,
		});

		await updateScheduleLastRun(ctx, {
			scheduleId,
			lastRunAt: Date.now(),
			nextRunAt: nextRunAt.getTime(),
		});
	},
});

export async function scheduleExecution(
	ctx: MutationCtx,
	scheduleData:
		| {
				taskId: Id<'tasks'>;
				owner: Id<'users'>;
				author: z.infer<typeof authorSchema>;
				skillKey: string;
				args: Record<string, unknown>;
				depth: number;
				scheduleType: 'one-time';
				timeZone: string;
				delaySeconds?: number;
		  }
		| {
				taskId: Id<'tasks'>;
				owner: Id<'users'>;
				author: z.infer<typeof authorSchema>;
				skillKey: string;
				args: Record<string, unknown>;
				depth: number;
				scheduleType: 'recurring';
				timeZone: string;
				delaySeconds?: number;
				cronExpression: string;
		  },
	scheduledDate: Date,
	scheduleId: Id<'schedules'>,
): Promise<string> {
	//
	if (scheduleData.scheduleType === 'one-time') {
		return await ctx.scheduler.runAt(scheduledDate, internal.schedule.lifecycle._executeOneTime, {
			scheduleId,
			taskId: scheduleData.taskId,
			owner: scheduleData.owner,
			author: scheduleData.author,
			skillKey: scheduleData.skillKey,
			args: scheduleData.args,
			depth: scheduleData.depth,
		});
	}

	return await ctx.scheduler.runAt(scheduledDate, internal.schedule.lifecycle._executeRecurring, {
		scheduleId,
		taskId: scheduleData.taskId,
		owner: scheduleData.owner,
		author: scheduleData.author,
		skillKey: scheduleData.skillKey,
		args: scheduleData.args,
		depth: scheduleData.depth,
		cronExpression: scheduleData.cronExpression,
		timeZone: scheduleData.timeZone,
	});
}
