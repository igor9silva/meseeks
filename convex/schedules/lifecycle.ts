import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { MutationCtx } from '../_generated/server';
import { _add as _addAction } from '../action/private';
import { internalMutation } from '../lib';
import { computeNextRun } from '../lib/cron';
import { authorSchema } from '../schemas/authorSchema';
import { _updateJobId, _updateLastRun } from './private';

export const _executeOneTime = internalMutation({
	args: {
		scheduleId: zid('schedules'),
		taskId: zid('tasks'),
		owner: zid('users'),
		author: authorSchema,
		skillKey: z.string(),
		args: z.record(z.any()),
		depth: z.number(),
	},
	handler: async (ctx, { scheduleId, taskId, owner, author, skillKey, args, depth }) => {
		//
		await _addAction(ctx, {
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

export const _executeRecurring = internalMutation({
	args: {
		scheduleId: zid('schedules'),
		taskId: zid('tasks'),
		owner: zid('users'),
		author: authorSchema,
		skillKey: z.string(),
		args: z.record(z.any()),
		depth: z.number(),
		cronExpression: z.string(),
		timeZone: z.string(),
	},
	handler: async (ctx, { scheduleId, taskId, owner, author, skillKey, args, depth, cronExpression, timeZone }) => {
		//
		await _addAction(ctx, {
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

		await _updateJobId(ctx, {
			scheduleId,
			scheduledJobId,
		});

		await _updateLastRun(ctx, {
			scheduleId,
			lastRunAt: Date.now(),
			nextRunAt: nextRunAt.getTime(),
		});
	},
});

export async function scheduleExecution(
	ctx: MutationCtx,
	scheduleData: {
		taskId: Id<'tasks'>;
		owner: Id<'users'>;
		author: z.infer<typeof authorSchema>;
		skillKey: string;
		args: Record<string, any>;
		depth: number;
		scheduleType: 'one-time' | 'recurring';
		timeZone: string;
		delaySeconds?: number;
		cronExpression?: string;
	},
	scheduledDate: Date,
	scheduleId: Id<'schedules'>,
): Promise<string> {
	//
	const baseParams = {
		scheduleId,
		taskId: scheduleData.taskId,
		owner: scheduleData.owner,
		author: scheduleData.author,
		skillKey: scheduleData.skillKey,
		args: scheduleData.args,
		depth: scheduleData.depth,
	};

	if (scheduleData.scheduleType === 'one-time') {
		return await ctx.scheduler.runAt(scheduledDate, internal.schedules.lifecycle._executeOneTime, baseParams);
	} else {
		//
		return await ctx.scheduler.runAt(scheduledDate, internal.schedules.lifecycle._executeRecurring, {
			...baseParams,
			cronExpression: scheduleData.cronExpression!,
			timeZone: scheduleData.timeZone,
		});
	}
}
