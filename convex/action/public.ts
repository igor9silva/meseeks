import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { mutation, query } from '../lib';
import { paginationOptionsSchema } from '../schemas/paginationOptionsSchema';
import { ensureTaskOwner } from '../tasks/public';
import { _add, _authorize, _findAllPaginated, _findAllRunning, _findOne } from './private';
import { _addWithActions } from '../tasks/private';
import { current as getCurrentUser } from '../users/public';
import type { Doc } from '../_generated/dataModel';

export const act = mutation({
	args: {
		taskId: zid('tasks').optional(),
		skillKey: z.string(),
		args: z.record(z.any()),
		shouldReopen: z.boolean().optional().default(false),
	},
	handler: async (ctx, { taskId, skillKey, args, shouldReopen }) => {
		//
		let resolvedTaskId = taskId;
		let currentUser: Doc<'users'>;

		if (resolvedTaskId) {
			const result = await ensureTaskOwner(ctx, { taskId: resolvedTaskId });
			currentUser = result.currentUser;
		} else {
			currentUser = await getCurrentUser(ctx, {});
			resolvedTaskId = await _addWithActions(ctx, {
				author: currentUser._id,
				owner: currentUser._id,
				skills: [],
			});
		}

		console.debug(`use skill on task '${resolvedTaskId}'`);

		const actionId = await _add(ctx, {
			skillKey,
			args,
			taskId: resolvedTaskId,
			depth: 0,
			author: currentUser._id,
			owner: currentUser._id,
			shouldReopen,
		});

		return { taskId: resolvedTaskId, actionId };
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
