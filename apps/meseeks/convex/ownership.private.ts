import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { NotFound } from 'lib/errors';
import { rootPath } from './fileConstants.private';
import { getCurrentUser } from './users.private';

export const ensureOwnedFile = async (
	ctx: QueryCtx | MutationCtx,
	{ file, owner }: { file: Id<'files'>; owner?: Id<'users'> },
) => {
	const doc = await ctx.db.get(file);
	if (!doc || doc.isDeleted) throw NotFound();
	if (owner && doc.owner !== owner) throw NotFound();
	return doc;
};

export const ensureOwnedDirectory = async (
	ctx: QueryCtx | MutationCtx,
	{ directory, owner }: { directory: Id<'files'>; owner?: Id<'users'> },
) => {
	const doc = await ensureOwnedFile(ctx, { file: directory, owner });
	if (doc.kind !== 'folder') throw NotFound();
	return doc;
};

export const ensureCurrentUserDirectory = async (
	ctx: QueryCtx | MutationCtx,
	{ directory }: { directory: Id<'files'> },
) => {
	const currentUser = await getCurrentUser(ctx, {});
	const doc = await ensureOwnedDirectory(ctx, { directory, owner: currentUser._id });
	return { currentUser, directory: doc };
};

export const findCurrentUserRootDirectory = async (ctx: QueryCtx | MutationCtx) => {
	const currentUser = await getCurrentUser(ctx, {});
	if (currentUser.rootFile) {
		const root = await ctx.db.get(currentUser.rootFile);
		if (root && !root.isDeleted && root.owner === currentUser._id && root.kind === 'folder') {
			return { currentUser, root };
		}
	}

	const root = await ctx.db
		.query('files')
		.withIndex('by_owner_parent_isDeleted', (q) =>
			q
				.eq('owner', currentUser._id) //
				.eq('parent', undefined)
				.eq('isDeleted', false),
		)
		.filter((q) => q.and(q.eq(q.field('path'), rootPath), q.eq(q.field('kind'), 'folder')))
		.first();

	return { currentUser, root };
};
