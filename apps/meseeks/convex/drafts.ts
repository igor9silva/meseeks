import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { mutation, query } from 'lib/convex';
import { draftQueueItemSchema } from 'schemas/draftSchema';
import { clearDraft, findDraft, saveDraft } from './drafts.private';
import { ensureFileOwner } from './files.private';
import { getCurrentUser } from './users.private';

export const findOne = query({
	args: {
		fileId: zid('files'),
	},
	handler: async (ctx, { fileId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, { fileId: fileId, owner: currentUser._id });
		return await findDraft(ctx, { owner: currentUser._id, fileId: fileId });
	},
});

export const save = mutation({
	args: {
		fileId: zid('files'),
		queue: z.array(draftQueueItemSchema),
		message: z.string(),
	},
	handler: async (ctx, { fileId, queue, message }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, { fileId: fileId, owner: currentUser._id });
		return await saveDraft(ctx, { owner: currentUser._id, fileId: fileId, queue, message });
	},
});

export const clear = mutation({
	args: {
		fileId: zid('files'),
	},
	handler: async (ctx, { fileId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, { fileId: fileId, owner: currentUser._id });
		await clearDraft(ctx, { owner: currentUser._id, fileId: fileId });
	},
});
