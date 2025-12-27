import { zid } from 'convex-helpers/server/zod';
import { Id } from '../_generated/dataModel';
import { mutation, query } from '../lib';
import { NotFound } from '../lib/errors';
import { ensureTaskOwner } from '../tasks/public';
import { current as getCurrentUser } from '../users/public';
import { _listByTask } from './private';

export const cancel = mutation({
	args: {
		scheduleId: zid('schedules'),
	},
	handler: async (ctx, { scheduleId }) => {
		//
		const schedule = await ctx.db.get(scheduleId);
		if (!schedule) throw NotFound();

		// Ensure user owns the schedule
		await ensureTaskOwner(ctx, { taskId: schedule.taskId });

		// Cancel the scheduled job if it exists
		if (schedule.scheduledJobId) {
			//
			await ctx.scheduler.cancel(schedule.scheduledJobId as Id<'_scheduled_functions'>);
		}

		// Delete the schedule entirely
		await ctx.db.delete(scheduleId);
	},
});

export const listByTask = query({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		// Ensure user owns the task
		await ensureTaskOwner(ctx, { taskId });

		return await _listByTask(ctx, { taskId });
	},
});

export const listByOwner = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

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
