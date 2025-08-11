import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { mutation, query } from '../lib';
import { paginationOptionsSchema } from '../schemas/paginationOptionsSchema';
import { ensureTaskOwner } from '../tasks/public';
import { _add, _authorize, _findAllPaginated, _findAllRunning, _findOne, _findPendingAuthorization } from './private';

export const act = mutation({
	args: {
		taskId: zid('tasks'),
		skillKey: z.string(),
		args: z.record(z.any()),
		shouldReopen: z.boolean().optional().default(false),
	},
	handler: async (ctx, { taskId, skillKey, args, shouldReopen }) => {
		//
		console.debug(`use skill on task '${taskId}'`);

		const { currentUser } = await ensureTaskOwner(ctx, { taskId });

		return await _add(ctx, {
			skillKey,
			args,
			taskId,
			depth: 0,
			author: currentUser._id,
			owner: currentUser._id,
			shouldReopen,
		});
	},
});

export const authorize = mutation({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
		hasApproved: z.boolean(),
	},
	handler: async (ctx, { taskId, actionId, hasApproved }) => {
		//
		const { currentUser } = await ensureTaskOwner(ctx, { taskId });

		await _authorize(ctx, {
			taskId,
			actionId,
			approver: currentUser._id,
			hasApproved,
		});
	},
});

export const approveBlockingAction = mutation({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		const { currentUser } = await ensureTaskOwner(ctx, { taskId });

		// Find the most recent pending authorization action
		const pendingAction = await _findPendingAuthorization(ctx, { taskId });

		if (!pendingAction) throw new Error('No pending authorization actions found');

		// Approve it
		await _authorize(ctx, {
			taskId,
			actionId: pendingAction._id,
			approver: currentUser._id,
			hasApproved: true,
		});

		return pendingAction._id;
	},
});

export const findAllPaginated = query({
	args: {
		taskId: zid('tasks'),
		paginationOpts: paginationOptionsSchema,
	},
	handler: async (ctx, { taskId, paginationOpts }) => {
		//
		await ensureTaskOwner(ctx, { taskId });

		return await _findAllPaginated(ctx, { taskId, paginationOpts });
	},
});

export const findAllRunning = query({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		await ensureTaskOwner(ctx, { taskId });

		return await _findAllRunning(ctx, { taskId });
	},
});

export const findOne = query({
	args: {
		actionId: zid('actions'),
	},
	handler: async (ctx, { actionId }) => {
		//
		const action = await _findOne(ctx, { actionId });

		await ensureTaskOwner(ctx, { taskId: action.taskId });

		return action;
	},
});
