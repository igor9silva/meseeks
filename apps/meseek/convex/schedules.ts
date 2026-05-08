import { zid } from 'convex-helpers/server/zod3';
import { internalMutation, internalQuery, mutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { cancelSchedule, createSchedule, findTaskSchedules } from './schedules.private';
import { ensureTaskOwner } from './tasks.private';
import { getCurrentUser } from './users.private';

const scheduledFunctionIdSchema = zid('_scheduled_functions');

// called by skills/builtIn/schedule.ts so the ai can create schedules
export const _create = internalMutation({
	args: createSchedule.args.shape,
	handler: createSchedule,
});

// used by magicRock.private.ts to render {{taskSchedules}} from the same normalized listing logic
export const _findByTask = internalQuery({
	args: findTaskSchedules.args.shape,
	handler: findTaskSchedules,
});

// called by skills/builtIn/cancelSchedule.ts so the ai can cancel schedules
export const _cancel = internalMutation({
	args: cancelSchedule.args.shape,
	handler: cancelSchedule,
});

export const cancel = mutation({
	args: {
		scheduleId: zid('schedules'),
	},
	handler: async (ctx, { scheduleId }) => {
		//
		const schedule = await ctx.db.get(scheduleId);
		if (!schedule) throw NotFound();

		await ensureTaskOwner(ctx, { taskId: schedule.taskId });

		if (schedule.scheduledJobId) {
			//
			const scheduledJobId = scheduledFunctionIdSchema.parse(schedule.scheduledJobId);
			await ctx.scheduler.cancel(scheduledJobId);
		}

		await ctx.db.delete(scheduleId);
	},
});

export const findByTask = query({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		await ensureTaskOwner(ctx, { taskId });

		return await findTaskSchedules(ctx, { taskId });
	},
});

export const findByOwner = query({
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
