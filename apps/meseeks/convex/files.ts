import { zid } from 'convex-helpers/server/zod3';
import { internal } from 'convex/_generated/api';
import { action, internalQuery, mutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { getCurrentUser } from './users.private';
import { ensureFileOwner, ensureUserRootDirectory, findFile, listFileChildren } from './files.private';
import { createReadUrl as createBodyReadUrl } from './storage.private';

export const findRoot = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		if (!currentUser.root) throw NotFound();

		return await findFile(ctx, { file: currentUser.root });
	},
});

export const ensureUserRoot = mutation({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await ensureUserRootDirectory(ctx, { owner: currentUser._id });
	},
});

export const list = query({
	args: {
		parent: zid('files'),
	},
	handler: async (ctx, { parent }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await listFileChildren(ctx, { owner: currentUser._id, parent });
	},
});

export const listRevisions = query({
	args: {
		file: zid('files'),
	},
	handler: async (ctx, { file }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, {
			owner: currentUser._id,
			file,
		});

		return await ctx.db
			.query('file_revisions')
			.withIndex('by_owner_file', (q) =>
				q
					.eq('owner', currentUser._id) //
					.eq('file', file),
			)
			.order('desc')
			.collect();
	},
});

export const listRevisionsByAction = query({
	args: {
		action: zid('actions'),
	},
	handler: async (ctx, { action }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const row = await ctx.db.get(action);
		if (!row) throw NotFound();
		if (row.owner !== currentUser._id) throw NotFound();

		return await ctx.db
			.query('file_revisions')
			.withIndex('by_action', (q) => q.eq('action', action))
			.collect();
	},
});

export const find = query({
	args: {
		file: zid('files'),
	},
	handler: async (ctx, args) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await ensureFileOwner(ctx, {
			owner: currentUser._id,
			file: args.file,
		});
	},
});

export const createReadUrl = action({
	args: {
		file: zid('files'),
	},
	handler: async (ctx, { file }): Promise<{ readUrl: string; expiresAt: number }> => {
		//
		const { storageKey }: { storageKey: string } = await ctx.runQuery(internal.files._findReadStorageKey, {
			file,
		});

		return await createBodyReadUrl({ storageKey });
	},
});

export const _findReadStorageKey = internalQuery({
	args: {
		file: zid('files'),
	},
	handler: async (ctx, { file }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const row = await ensureFileOwner(ctx, {
			owner: currentUser._id,
			file,
		});
		if (row.kind !== 'file') throw NotFound();
		if (!row.currentRevision) throw NotFound();

		const revision = await ctx.db.get(row.currentRevision);
		if (!revision?.storageKey) throw NotFound();

		return { storageKey: revision.storageKey };
	},
});
