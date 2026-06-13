import { z } from 'zod/v3';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { changedPathSchema } from 'schemas/workspaceSchema';
import { ensureOwnedDirectory } from './ownership.private';
import { now } from './time.private';

export const insertChangeset = async (
	ctx: MutationCtx,
	{
		owner,
		directory,
		action,
		created,
		updated,
		deleted,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		action: Id<'actions'>;
		created: z.infer<typeof changedPathSchema>[];
		updated: z.infer<typeof changedPathSchema>[];
		deleted?: z.infer<typeof changedPathSchema>[];
	},
) => {
	await ensureOwnedDirectory(ctx, { directory, owner });
	const at = now();
	const existing = await ctx.db
		.query('changesets')
		.withIndex('by_action', (q) => q.eq('action', action))
		.first();
	const deletedChanges = deleted ?? [];
	const changeset = existing
		? existing._id
		: await ctx.db.insert('changesets', {
				owner,
				directory,
				action,
				created: [],
				updated: [],
				deleted: [],
				renamed: [],
				reviewState: 'applied',
				createdAt: at,
				updatedAt: at,
			});

	if (existing) {
		await ctx.db.patch(existing._id, {
			created: existing.created.concat(created),
			updated: existing.updated.concat(updated),
			deleted: existing.deleted.concat(deletedChanges),
			updatedAt: at,
		});
	} else {
		await ctx.db.patch(changeset, {
			created,
			updated,
			deleted: deletedChanges,
			updatedAt: at,
		});
	}

	await ctx.db.patch(action, {
		changeset,
		updatedAt: at,
	});

	const revisionIds = created
		.concat(updated, deletedChanges)
		.flatMap((change) => [change.beforeRevision, change.afterRevision])
		.filter((revision): revision is Id<'file_revisions'> => Boolean(revision));
	for (const revision of revisionIds) {
		await ctx.db.patch(revision, { changeset });
	}

	return changeset;
};
