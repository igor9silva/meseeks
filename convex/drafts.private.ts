import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { defineMutation, defineQuery } from 'lib/convex';
import { draftQueueItemSchema } from 'schemas/draftSchema';

export const findDraft = defineQuery({
	args: z.object({
		owner: zid('users'),
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { owner, taskId }) => {
		//
		return await ctx.db
			.query('drafts')
			.withIndex('by_owner_taskId', (q) => q.eq('owner', owner).eq('taskId', taskId))
			.unique();
	},
});

// export const _findAll: ReturnType<typeof internalQuery> = internalQuery({
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

export const saveDraft = defineMutation({
	args: z.object({
		owner: zid('users'),
		taskId: zid('tasks'),
		queue: z.array(draftQueueItemSchema),
		message: z.string(),
	}),
	handler: async (ctx, { owner, taskId, queue, message }) => {
		//
		const existing = await findDraft(ctx, { owner, taskId });
		const data = { owner, taskId, queue, message, updatedAt: Date.now() };

		if (existing) {
			await ctx.db.patch(existing._id, data);
		} else {
			await ctx.db.insert('drafts', data);
		}
	},
});

export const clearDraft = defineMutation({
	args: z.object({
		owner: zid('users'),
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { owner, taskId }) => {
		//
		const existing = await findDraft(ctx, { owner, taskId });

		if (existing) await ctx.db.delete(existing._id);
	},
});
