import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { mutation, query } from '../lib';
import { draftQueueItemSchema } from '../schemas/draftSchema';
import { current as getCurrentUser } from '../users/public';
import { _clear, _findOne, _save } from './private';

export const findOne = query({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await _findOne(ctx, { owner: currentUser._id, taskId });
	},
});

// export const findAll = query({
// 	args: {},
// 	handler: async (ctx) => {
// 		//
// 		const currentUser = await getCurrentUser(ctx, {});

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
		const currentUser = await getCurrentUser(ctx, {});

		await _save(ctx, { owner: currentUser._id, taskId, queue, message });
	},
});

export const clear = mutation({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		await _clear(ctx, { owner: currentUser._id, taskId });
	},
});
