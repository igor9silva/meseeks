import { zid } from 'convex-helpers/server/zod3';
import { query, mutation } from 'lib/convex';
import { ensureFileOwner } from './files.private';
import { deriveReadState, markFileRead } from './reads.private';
import { latestActionForFile } from './reactor.private';
import { getCurrentUser } from './users.private';

export const state = query({
	args: {
		file: zid('files'),
	},
	handler: async (ctx, { file }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, {
			fileId: file,
			owner: currentUser._id,
		});

		return await deriveReadState(ctx, {
			user: currentUser._id,
			file,
		});
	},
});

export const markRead = mutation({
	args: {
		file: zid('files'),
	},
	handler: async (ctx, { file }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, {
			fileId: file,
			owner: currentUser._id,
		});
		const latestAction = await latestActionForFile(ctx, { file });

		return await markFileRead(ctx, {
			user: currentUser._id,
			file,
			lastReadActionIndex: latestAction?.index ?? 0,
		});
	},
});
