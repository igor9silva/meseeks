import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { Id } from './_generated/dataModel';
import { defineMutation, defineQuery } from './lib';
import { NotFound } from './lib/errors';
import { computeNextRun, isExpressionValid } from './lib/cron';
import { authorSchema } from './schemas/authorSchema';
import { scheduleExecution } from './schedule/lifecycle.private';

const scheduledFunctionIdSchema = zid('_scheduled_functions');

export const create = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		owner: zid('users'),
		author: authorSchema,
		skillKey: z.string(),
		args: z.record(z.unknown()),
		depth: z.number().min(0).max(1000),
		scheduleType: z.enum(['one-time', 'recurring']),
		timeZone: z.string(),
		delaySeconds: z.number().optional(),
		scheduledAt: z.string().optional(), // ISO string
		cronExpression: z.string().optional(),
	}),
	handler: async (ctx, scheduleData) => {
		//
		validateScheduleData(scheduleData);

		const nextRunDate = calculateNextRun(scheduleData);
		const scheduleId = await ctx.db.insert('schedules', buildRecord(scheduleData, nextRunDate));
		let scheduledJobId: string;

		if (scheduleData.scheduleType === 'one-time') {
			scheduledJobId = await scheduleExecution(
				ctx,
				{
					taskId: scheduleData.taskId,
					owner: scheduleData.owner,
					author: scheduleData.author,
					skillKey: scheduleData.skillKey,
					args: scheduleData.args,
					depth: scheduleData.depth,
					scheduleType: 'one-time',
					timeZone: scheduleData.timeZone,
					delaySeconds: scheduleData.delaySeconds,
				},
				nextRunDate,
				scheduleId,
			);
		} else {
			//
			if (!scheduleData.cronExpression) throw new Error('Cron expression is required for recurring schedules');

			scheduledJobId = await scheduleExecution(
				ctx,
				{
					taskId: scheduleData.taskId,
					owner: scheduleData.owner,
					author: scheduleData.author,
					skillKey: scheduleData.skillKey,
					args: scheduleData.args,
					depth: scheduleData.depth,
					scheduleType: 'recurring',
					timeZone: scheduleData.timeZone,
					delaySeconds: scheduleData.delaySeconds,
					cronExpression: scheduleData.cronExpression,
				},
				nextRunDate,
				scheduleId,
			);
		}

		await updateJobId(ctx, { scheduleId, scheduledJobId });

		return scheduleId;
	},
});

export const listByTask = defineQuery({
	args: z.object({
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { taskId }) => {
		//
		return await ctx.db
			.query('schedules')
			.withIndex('by_task', (q) => q.eq('taskId', taskId))
			.collect();
	},
});

export const updateLastRun = defineMutation({
	args: z.object({
		scheduleId: zid('schedules'),
		lastRunAt: z.number(),
		nextRunAt: z.number().optional(),
	}),
	handler: async (ctx, { scheduleId, lastRunAt, nextRunAt }) => {
		//
		const schedule = await ctx.db.get(scheduleId);
		if (!schedule) throw NotFound();

		await ctx.db.patch(scheduleId, { lastRunAt });

		if (nextRunAt) {
			await ctx.db.patch(scheduleId, { nextRunAt });
		}
	},
});

export const cancel = defineMutation({
	args: z.object({
		scheduleId: zid('schedules'),
	}),
	handler: async (ctx, { scheduleId }) => {
		//
		const schedule = await ctx.db.get(scheduleId);
		if (!schedule) return;

		if (schedule.scheduledJobId) {
			const scheduledJobId = scheduledFunctionIdSchema.parse(schedule.scheduledJobId);
			await ctx.scheduler.cancel(scheduledJobId);
		}

		await ctx.db.delete(scheduleId);
	},
});

export const updateJobId = defineMutation({
	args: z.object({
		scheduleId: zid('schedules'),
		scheduledJobId: z.string(),
	}),
	handler: async (ctx, { scheduleId, scheduledJobId }) => {
		//
		await ctx.db.patch(scheduleId, { scheduledJobId });
	},
});

export const cancelAllForTask = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { taskId }) => {
		//
		const schedules = await listByTask(ctx, { taskId });

		await Promise.all(schedules.map((schedule) => cancel(ctx, { scheduleId: schedule._id })));

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
		}

		return new Date(scheduleData.scheduledAt!);
	}

	return computeNextRun(scheduleData.cronExpression!, scheduleData.timeZone);
}

function buildRecord(
	scheduleData: {
		taskId: Id<'tasks'>;
		owner: Id<'users'>;
		author: z.infer<typeof authorSchema>;
		skillKey: string;
		args: Record<string, unknown>;
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
	}

	return {
		...baseRecord,
		scheduleType: 'recurring' as const,
		cronExpression: scheduleData.cronExpression!,
	};
}
