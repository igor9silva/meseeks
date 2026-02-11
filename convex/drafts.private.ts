import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { defineMutation, defineQuery } from './lib';
import { draftQueueItemSchema } from './schemas/draftSchema';

const findOneDraft = async (
	ctx: QueryCtx | MutationCtx,
	{
		owner,
		taskId,
	}: {
		owner: Id<'users'>;
		taskId: Id<'tasks'>;
	},
) => {
	//
	return await ctx.db
		.query('drafts')
		.withIndex('by_owner_taskId', (q) => q.eq('owner', owner).eq('taskId', taskId))
		.unique();
};

export const findOne = defineQuery({
	args: z.object({
		owner: zid('users'),
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { owner, taskId }) => {
		//
		return await findOneDraft(ctx, { owner, taskId });
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

export const save = defineMutation({
	args: z.object({
		owner: zid('users'),
		taskId: zid('tasks'),
		queue: z.array(draftQueueItemSchema),
		message: z.string(),
	}),
	handler: async (ctx, { owner, taskId, queue, message }) => {
		//
		const existing = await findOneDraft(ctx, { owner, taskId });
		const data = { owner, taskId, queue, message, updatedAt: Date.now() };

		if (existing) {
			await ctx.db.patch(existing._id, data);
		} else {
			await ctx.db.insert('drafts', data);
		}
	},
});

export const clear = defineMutation({
	args: z.object({
		owner: zid('users'),
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { owner, taskId }) => {
		//
		const existing = await findOneDraft(ctx, { owner, taskId });

		if (existing) await ctx.db.delete(existing._id);
	},
});
