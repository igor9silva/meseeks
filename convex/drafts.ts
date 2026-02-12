import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internalMutation, internalQuery, mutation, query } from 'lib/functions';
import {
	clear as clearDraft, //
	findOne as findOneDraft,
	save as saveDraft,
} from './drafts.private';
import { draftQueueItemSchema } from 'schemas/draftSchema';
import { current } from './users.private';

export const _findOne = internalQuery({
	args: findOneDraft.args.shape,
	handler: async (ctx, args) => {
		//
		return await findOneDraft(ctx, args);
	},
});

export const _save = internalMutation({
	args: saveDraft.args.shape,
	handler: async (ctx, args) => {
		//
		return await saveDraft(ctx, args);
	},
});

export const _clear = internalMutation({
	args: clearDraft.args.shape,
	handler: async (ctx, args) => {
		//
		return await clearDraft(ctx, args);
	},
});

export const findOne = query({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		const currentUser = await current(ctx, {});
		return await findOneDraft(ctx, { owner: currentUser._id, taskId });
	},
});

// export const findAll = query({
// 	args: {},
// 	handler: async (ctx) => {
// 		//
// 		const currentUser = await current(ctx, {});

// 		return await _findAll(ctx, { owner: currentUser._id });
// 	},
// });

export const save = mutation({
	args: {
		taskId: zid('tasks'),
		queue: z.array(draftQueueItemSchema),
		message: z.string(),
	},
	handler: async (ctx, { taskId, queue, message }) => {
		//
		const currentUser = await current(ctx, {});
		return await saveDraft(ctx, { owner: currentUser._id, taskId, queue, message });
	},
});

export const clear = mutation({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		const currentUser = await current(ctx, {});
		await clearDraft(ctx, { owner: currentUser._id, taskId });
	},
});
