import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internalMutation, internalQuery } from '../lib';
import { draftQueueItemSchema } from '../schemas/draftSchema';

export const _findOne = internalQuery({
	args: {
		owner: zid('users'),
		taskId: zid('tasks'),
	},
	handler: async (ctx, { owner, taskId }) => {
		//
		return await ctx.db
			.query('drafts')
			.withIndex('by_owner_taskId', (q) => q.eq('owner', owner).eq('taskId', taskId))
			.unique();
	},
});

// export const _findAll = internalQuery({
// 	args: {
// 		owner: zid('users'),
// 	},
// 	handler: async (ctx, { owner }) => {
// 		//
// 		return await ctx.db
// 			.query('drafts')
// 			.withIndex('by_owner_taskId', (q) => q.eq('owner', owner))
// 			.order('desc')
// 			.collect();
// 	},
// });

export const _save = internalMutation({
	args: {
		owner: zid('users'),
		taskId: zid('tasks'),
		queue: z.array(draftQueueItemSchema),
		message: z.string(),
	},
	handler: async (ctx, { owner, taskId, queue, message }) => {
		//
		const existing = await _findOne(ctx, { owner, taskId });
		const data = { owner, taskId, queue, message, updatedAt: Date.now() };

		if (existing) {
			ctx.db.replace;
			await ctx.db.patch(existing._id, data);
		} else {
			await ctx.db.insert('drafts', data);
		}
	},
});

export const _clear = internalMutation({
	args: {
		owner: zid('users'),
		taskId: zid('tasks'),
	},
	handler: async (ctx, { owner, taskId }) => {
		//
		const existing = await _findOne(ctx, { owner, taskId });

		if (existing) await ctx.db.delete(existing._id);
	},
});
