import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { internalMutation, internalQuery, mutation, query } from './lib';
import { newActionSchema } from './schemas/actionSchema';
import { authorSchema } from './schemas/authorSchema';
import { paginationOptionsSchema } from './schemas/paginationOptionsSchema';
import { ensureTaskOwner } from './tasks';
import {
	add,
	addMany,
	authorize as authorizeAction,
	findAllSince,
	findAllPaginated as findActionsPaginated,
	findAllRunning as findAllRunningActions,
	findLastActions,
	findNext,
	findOne as findAction,
	findPendingAuthorization,
	findReactions,
	findRunning,
	skipAllPendingReactions,
	skipPendingAuthorizationByTaskAuthor,
	stop,
} from './action.private';

export const _add = internalMutation({
	args: {
		...newActionSchema.shape,
		shouldReopen: z.boolean().optional().default(false),
	},
	handler: async (ctx, args) => {
		//
		return await add(ctx, args);
	},
});

export const _addMany = internalMutation({
	args: {
		taskId: zid('tasks'),
		owner: zid('users'),
		author: authorSchema,
		depth: z.number().min(0).max(1000),
		shouldReopen: z.boolean().optional().default(false),
		skills: z.array(
			z.object({
				skillKey: z.string().describe('The key of the skill to use'),
				args: z.record(z.unknown()),
			}),
		),
	},
	handler: async (ctx, args) => {
		//
		return await addMany(ctx, args);
	},
});

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
	handler: async (ctx, args) => {
		//
		await authorizeAction(ctx, args);
	},
});

export const _findAllSince = internalQuery({
	args: {
		taskId: zid('tasks'),
		since: z.number(),
	},
	handler: async (ctx, args) => {
		//
		return await findAllSince(ctx, args);
	},
});

export const _findAllPaginated = internalQuery({
	args: {
		taskId: zid('tasks'),
		paginationOpts: paginationOptionsSchema,
	},
	handler: async (ctx, args) => {
		//
		return await findActionsPaginated(ctx, args);
	},
});

export const _findOne = internalQuery({
	args: {
		actionId: zid('actions'),
	},
	handler: async (ctx, args) => {
		//
		return await findAction(ctx, args);
	},
});

export const _findAllRunning = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, args) => {
		//
		return await findAllRunningActions(ctx, args);
	},
});

export const _findRunning = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, args) => {
		//
		return await findRunning(ctx, args);
	},
});

export const _findPendingAuthorization = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, args) => {
		//
		return await findPendingAuthorization(ctx, args);
	},
});

export const _skipPendingAuthorizationByTaskAuthor = internalMutation({
	args: {
		taskId: zid('tasks'),
		author: authorSchema,
		reasonText: z.string(),
	},
	handler: async (ctx, args) => {
		//
		await skipPendingAuthorizationByTaskAuthor(ctx, args);
	},
});

export const _findNext = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, args) => {
		//
		return await findNext(ctx, args);
	},
});

export const _findReactions = internalQuery({
	args: {
		taskId: zid('tasks'),
		owner: zid('users'),
		status: z.enum(['enqueued', 'pending authorization']),
	},
	handler: async (ctx, args) => {
		//
		return await findReactions(ctx, args);
	},
});

export const _findLastActions = internalQuery({
	args: {
		taskId: zid('tasks'),
		amount: z.number().min(1),
	},
	handler: async (ctx, args) => {
		//
		return await findLastActions(ctx, args);
	},
});

export const _skipAllPendingReactions = internalMutation({
	args: {
		taskId: zid('tasks'),
		owner: zid('users'),
		shouldSkipRunning: z.boolean().optional().default(false),
	},
	handler: async (ctx, args) => {
		//
		await skipAllPendingReactions(ctx, args);
	},
});

export const _stop = internalMutation({
	args: {
		taskId: zid('tasks'),
		author: authorSchema,
		authorIsOwner: z.boolean(),
	},
	handler: async (ctx, args) => {
		//
		await stop(ctx, args);
	},
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
