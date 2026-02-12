import { zid } from 'convex-helpers/server/zod';
import type { Id } from './_generated/dataModel';
import { internalMutation, internalQuery, mutation, query } from 'lib/functions';
import { NotFound } from 'lib/errors';
import {
	cancel as cancelSchedule,
	cancelAllForTask,
	create,
	listByTask as listSchedulesByTask,
	updateJobId,
	updateLastRun,
} from './schedules.private';
import { current } from './users.private';

const scheduledFunctionIdSchema = zid('_scheduled_functions');

export const _create = internalMutation({
	args: create.args.shape,
	handler: async (ctx, args) => {
		//
		return await create(ctx, args);
	},
});

export const _listByTask = internalQuery({
	args: listSchedulesByTask.args.shape,
	handler: async (ctx, args) => {
		//
		return await listSchedulesByTask(ctx, args);
	},
});

export const _updateLastRun = internalMutation({
	args: updateLastRun.args.shape,
	handler: async (ctx, args) => {
		//
		await updateLastRun(ctx, args);
	},
});

export const _cancel = internalMutation({
	args: cancelSchedule.args.shape,
	handler: async (ctx, args) => {
		//
		await cancelSchedule(ctx, args);
	},
});

export const _updateJobId = internalMutation({
	args: updateJobId.args.shape,
	handler: async (ctx, args) => {
		//
		await updateJobId(ctx, args);
	},
});

export const _cancelAllForTask = internalMutation({
	args: cancelAllForTask.args.shape,
	handler: async (ctx, args) => {
		//
		return await cancelAllForTask(ctx, args);
	},
});

const ensureTaskIsOwnedByCurrentUser = async (ctx: Parameters<typeof current>[0], taskId: Id<'tasks'>) => {
	//
	const currentUser = await current(ctx, {});
	const task = await ctx.db.get(taskId);

	if (!task) throw NotFound();
	if (task.owner !== currentUser._id) throw NotFound();
};

export const cancel = mutation({
	args: {
		scheduleId: zid('schedules'),
	},
	handler: async (ctx, { scheduleId }) => {
		//
		const schedule = await ctx.db.get(scheduleId);
		if (!schedule) throw NotFound();

		await ensureTaskIsOwnedByCurrentUser(ctx, schedule.taskId);

		if (schedule.scheduledJobId) {
			//
			const scheduledJobId = scheduledFunctionIdSchema.parse(schedule.scheduledJobId);
			await ctx.scheduler.cancel(scheduledJobId);
		}

		await ctx.db.delete(scheduleId);
	},
});

export const listByTask = query({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		await ensureTaskIsOwnedByCurrentUser(ctx, taskId);

		return await listSchedulesByTask(ctx, { taskId });
	},
});

export const listByOwner = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await current(ctx, {});

		const schedules = await ctx.db
			.query('schedules')
			.withIndex('by_owner', (q) => q.eq('owner', currentUser._id))
			.order('desc')
			.collect();

		// Fetch task titles in parallel
		const schedulesWithTasks = await Promise.all(
			schedules.map(async (schedule) => {
				//
				const task = await ctx.db.get(schedule.taskId);
				return {
					...schedule,
					taskTitle: task?.title || 'Untitled task',
				};
			}),
		);

		return schedulesWithTasks;
	},
});
