import { zid } from 'convex-helpers/server/zod3';
import { query, mutation } from 'lib/convex';
import { indexSchema } from 'schemas/indexSchema';
import { createActionsForFile } from './actions';
import { ensureFileOwner } from './files.private';
import { findIndexesForFile, findReadyIndexesByKind, upsertIndex } from './indexes.private';
import { getCurrentUser } from './users.private';

export const findForFile = query({
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

		return await findIndexesForFile(ctx, {
			file,
		});
	},
});

export const findReadyByKind = query({
	args: {
		kind: indexSchema.shape.kind,
	},
	handler: async (ctx, { kind }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await findReadyIndexesByKind(ctx, {
			owner: currentUser._id,
			kind,
		});
	},
});

export const embed = mutation({
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

		const actionIds = await createActionsForFile(ctx, {
			owner: currentUser._id,
			file,
			skills: [
				{
					skillKey: 'embed',
					args: {},
				},
			],
		});
		const actionId = actionIds[0];
		if (!actionId) throw new Error('embed action was not created');

		await upsertIndex(ctx, {
			owner: currentUser._id,
			file,
			kind: 'embedding',
			status: 'pending',
			data: {
				action: actionId,
			},
		});

		return actionId;
	},
});
