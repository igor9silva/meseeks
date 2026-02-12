import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internalMutation, internalQuery, mutation, query } from 'lib/functions';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import { ensureTaskOwner } from './tasks';
import {
	addMany,
	authorize as authorizeAction,
	findAllPaginated as findActionsPaginated,
	findAllRunning as findAllRunningActions,
	findLastActions,
	findNext,
	findOne as findAction,
	findPendingAuthorization,
	findRunning,
} from './action.private';

export const _authorize = internalMutation({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
		approver: z.union([
			zid('users'), //
			z.literal('auto'),
		]),
		hasApproved: z.boolean(),
	},
	handler: authorizeAction,
});

export const _findPendingAuthorization = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: findPendingAuthorization,
});

export const _findNext = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: findNext,
});

export const _findLastActions = internalQuery({
	args: {
		taskId: zid('tasks'),
		amount: z.number().min(1),
	},
	handler: findLastActions,
});

export const _findRunning = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: findRunning,
});

export const act = mutation({
	args: {
		taskId: zid('tasks'),
		skills: z
			.array(
				z.object({
					skillKey: z.string(),
					args: z.record(z.unknown()),
				}),
			)
			.min(1),
		shouldReopen: z.boolean().optional().default(true),
	},
	handler: async (ctx, { taskId, skills, shouldReopen }) => {
		//
		console.debug(`using ${skills.map((s) => s.skillKey).join(', ')} on task '${taskId}'`);

		const { currentUser } = await ensureTaskOwner(ctx, { taskId });

		return await addMany(ctx, {
			skills,
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

		await authorizeAction(ctx, {
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

		return await findActionsPaginated(ctx, { taskId, paginationOpts });
	},
});

export const findAllRunning = query({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		await ensureTaskOwner(ctx, { taskId });

		return await findAllRunningActions(ctx, { taskId });
	},
});

export const findOne = query({
	args: {
		actionId: zid('actions'),
	},
	handler: async (ctx, { actionId }) => {
		//
		const action = await findAction(ctx, { actionId });

		await ensureTaskOwner(ctx, { taskId: action.taskId });

		return action;
	},
});
