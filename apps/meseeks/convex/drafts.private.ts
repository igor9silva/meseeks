import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import { draftQueueItemSchema } from 'schemas/draftSchema';

export const findDraft = defineQuery({
	args: z.object({
		owner: zid('users'),
		fileId: zid('files'),
	}),
	handler: async (ctx, { owner, fileId }) => {
		//
		return await ctx.db
			.query('drafts')
			.withIndex('by_owner_fileId', (q) => q.eq('owner', owner).eq('fileId', fileId))
			.unique();
	},
});

export const saveDraft = defineMutation({
	args: z.object({
		owner: zid('users'),
		fileId: zid('files'),
		queue: z.array(draftQueueItemSchema),
		message: z.string(),
	}),
	handler: async (ctx, { owner, fileId, queue, message }) => {
		//
		const existing = await findDraft(ctx, { owner, fileId });
		const data = { owner, fileId, queue, message, updatedAt: Date.now() };

		if (existing) {
			await ctx.db.patch(existing._id, data);
			return existing._id;
		}

		return await ctx.db.insert('drafts', data);
	},
});

export const clearDraft = defineMutation({
	args: z.object({
		owner: zid('users'),
		fileId: zid('files'),
	}),
	handler: async (ctx, { owner, fileId }) => {
		//
		const existing = await findDraft(ctx, { owner, fileId });

		if (existing) await ctx.db.delete(existing._id);
	},
});
