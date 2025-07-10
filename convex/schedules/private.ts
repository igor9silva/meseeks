import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { Id } from '../_generated/dataModel';
import { internalMutation, internalQuery } from '../lib';
import { computeNextRun, isExpressionValid } from '../lib/cron';
import { authorSchema } from '../schemas/authorSchema';
import { scheduleExecution } from './lifecycle';

export const _create = internalMutation({
	args: {
		taskId: zid('tasks'),
		owner: zid('users'),
		author: authorSchema,
		skillKey: z.string(),
		args: z.record(z.any()),
		depth: z.number().min(0).max(1000),
		scheduleType: z.enum(['one-time', 'recurring']),
		timeZone: z.string(),
		delaySeconds: z.number().optional(),
		scheduledAt: z.string().optional(), // ISO string
		cronExpression: z.string().optional(),
	},
	handler: async (ctx, scheduleData) => {
		//
		validateScheduleData(scheduleData);

		const nextRunDate = calculateNextRun(scheduleData);

		const scheduleId = await ctx.db.insert('schedules', buildRecord(scheduleData, nextRunDate));

		const scheduledJobId = await scheduleExecution(ctx, scheduleData, nextRunDate, scheduleId);

		await _updateJobId(ctx, { scheduleId, scheduledJobId });

		return scheduleId;
	},
});

// export const _findOne = internalQuery({
// 	args: {
// 		scheduleId: zid('schedules'),
// 	},
// 	handler: async (ctx, { scheduleId }) => {
// 		//
// 		return await ctx.db.get(scheduleId);
// 	},
// });

export const _listByTask = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		return await ctx.db
			.query('schedules')
			.withIndex('by_task', (q) => q.eq('taskId', taskId))
			.collect();
	},
});

export const _updateLastRun = internalMutation({
	args: {
		scheduleId: zid('schedules'),
		lastRunAt: z.number(),
		nextRunAt: z.number().optional(),
	},
	handler: async (ctx, { scheduleId, lastRunAt, nextRunAt }) => {
		//
		const schedule = await ctx.db.get(scheduleId);
		if (!schedule) throw new Error('Schedule not found');

		await ctx.db.patch(scheduleId, { lastRunAt });

		if (nextRunAt) {
			await ctx.db.patch(scheduleId, { nextRunAt });
		}
	},
});

export const _cancel = internalMutation({
	args: {
		scheduleId: zid('schedules'),
	},
	handler: async (ctx, { scheduleId }) => {
		//
		const schedule = await ctx.db.get(scheduleId);
		if (!schedule) return;

		if (schedule.scheduledJobId) {
			await ctx.scheduler.cancel(schedule.scheduledJobId as Id<'_scheduled_functions'>);
		}

		await ctx.db.delete(scheduleId);
	},
});

export const _updateJobId = internalMutation({
	args: {
		scheduleId: zid('schedules'),
		scheduledJobId: z.string(),
	},
	handler: async (ctx, { scheduleId, scheduledJobId }) => {
		//
		await ctx.db.patch(scheduleId, { scheduledJobId });
	},
});

export const _cancelAllForTask = internalMutation({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }): Promise<number> => {
		//
		const schedules = await _listByTask(ctx, { taskId });

		// Cancel all schedules in parallel using the _cancel function
		await Promise.all(schedules.map((schedule) => _cancel(ctx, { scheduleId: schedule._id })));

		return schedules.length;
	},
});

function validateScheduleData(scheduleData: {
	scheduleType: 'one-time' | 'recurring';
	delaySeconds?: number;
	scheduledAt?: string;
	cronExpression?: string;
}) {
	//
	if (scheduleData.scheduleType === 'one-time') {
		//
		if (!scheduleData.delaySeconds && !scheduleData.scheduledAt) {
			throw new Error('One-time schedules require either delaySeconds or scheduledAt');
		}
		if (scheduleData.delaySeconds && scheduleData.scheduledAt) {
			throw new Error('Provide either delaySeconds OR scheduledAt, not both');
		}
		if (scheduleData.cronExpression) {
			throw new Error('One-time schedules cannot have cronExpression');
		}

		if (scheduleData.delaySeconds && scheduleData.delaySeconds < 0) {
			throw new Error('delaySeconds must be positive or zero');
		}

		if (scheduleData.scheduledAt) {
			//
			const date = new Date(scheduleData.scheduledAt);
			if (isNaN(date.getTime())) {
				throw new Error(`Invalid ISO8601 datetime: "${scheduleData.scheduledAt}"`);
			}
			if (date.getTime() <= Date.now()) {
				throw new Error('Scheduled time must be in the future');
			}
		}
	} else {
		//
		if (!scheduleData.cronExpression) {
			throw new Error('Recurring schedules require cronExpression');
		}

		if (scheduleData.delaySeconds || scheduleData.scheduledAt) {
			throw new Error('Recurring schedules cannot have delaySeconds or scheduledAt');
		}

		if (!isExpressionValid(scheduleData.cronExpression)) {
			throw new Error('Invalid cron expression');
		}
	}
}

function calculateNextRun(scheduleData: {
	scheduleType: 'one-time' | 'recurring';
	delaySeconds?: number;
	scheduledAt?: string;
	cronExpression?: string;
	timeZone: string;
}) {
	//
	if (scheduleData.scheduleType === 'one-time') {
		//
		if (scheduleData.delaySeconds) {
			const nextRunAt = Date.now() + scheduleData.delaySeconds * 1000;
			return new Date(nextRunAt);
		} else {
			return new Date(scheduleData.scheduledAt!);
		}
		//
	} else {
		//
		return computeNextRun(scheduleData.cronExpression!, scheduleData.timeZone);
	}
}

function buildRecord(
	scheduleData: {
		taskId: Id<'tasks'>;
		owner: Id<'users'>;
		author: z.infer<typeof authorSchema>;
		skillKey: string;
		args: Record<string, any>;
		depth: number;
		scheduleType: 'one-time' | 'recurring';
		timeZone: string;
		scheduledAt?: string;
		cronExpression?: string;
	},
	nextRunDate: Date,
) {
	//
	const baseRecord = {
		taskId: scheduleData.taskId,
		owner: scheduleData.owner,
		author: scheduleData.author,
		skillKey: scheduleData.skillKey,
		args: scheduleData.args,
		timeZone: scheduleData.timeZone,
		nextRunAt: nextRunDate.getTime(),
	};

	if (scheduleData.scheduleType === 'one-time') {
		//
		return {
			...baseRecord,
			scheduleType: 'one-time' as const,
			scheduledAt: nextRunDate.getTime(),
		};
		//
	} else {
		//
		return {
			...baseRecord,
			scheduleType: 'recurring' as const,
			cronExpression: scheduleData.cronExpression!,
		};
	}
}
