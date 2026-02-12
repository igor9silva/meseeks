import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { mutation, query } from 'lib/convex';
import {
	clear as clearDraft, //
	findOne as findOneDraft,
	save as saveDraft,
} from './drafts.private';
import { draftQueueItemSchema } from 'schemas/draftSchema';
import { getCurrentUser } from './users.private';

export const findOne = query({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await findOneDraft(ctx, { owner: currentUser._id, taskId });
	},
});

export const save = mutation({
	args: {
		taskId: zid('tasks'),
		queue: z.array(draftQueueItemSchema),
		message: z.string(),
	},
	handler: async (ctx, { taskId, queue, message }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await saveDraft(ctx, { owner: currentUser._id, taskId, queue, message });
	},
});

export const clear = mutation({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await clearDraft(ctx, { owner: currentUser._id, taskId });
	},
});
