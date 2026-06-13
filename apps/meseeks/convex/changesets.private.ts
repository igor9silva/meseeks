import { z } from 'zod/v3';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { NotFound } from 'lib/errors';
import { changedPathSchema } from 'schemas/workspaceSchema';
import { finishAction, startAction } from './actions.private';
import { insertChangeset } from './changes.private';
import { metadataEqual } from './metadata.private';
import { ensureCurrentUserDirectory } from './ownership.private';
import { insertRevision, readRevisionContent } from './revisions.private';
import { now } from './time.private';
import { getCurrentUser } from './users.private';

type Change = z.infer<typeof changedPathSchema>;
type FileDoc = Doc<'files'>;
type MetadataRestore = {
	file: FileDoc;
	currentMetadata: Record<string, string>;
	restoreMetadata: Record<string, string>;
};
type ContentRestore = {
	file: FileDoc;
	currentContent?: string;
	restoreContent: string;
};
type Restore = MetadataRestore | ContentRestore;

export const listChangesets = async (ctx: QueryCtx, { directory }: { directory: Id<'files'> }) => {
	const { currentUser } = await ensureCurrentUserDirectory(ctx, { directory });

	return await ctx.db
		.query('changesets')
		.withIndex('by_directory', (q) => q.eq('directory', directory))
		.filter((q) => q.eq(q.field('owner'), currentUser._id))
		.order('desc')
		.collect();
};

export const getChangeset = async (ctx: QueryCtx, { changeset }: { changeset: Id<'changesets'> }) => {
	const currentUser = await getCurrentUser(ctx, {});
	const doc = await ctx.db.get(changeset);
	if (!doc || doc.owner !== currentUser._id) throw NotFound();
	const action = await ctx.db.get(doc.action);
	return { changeset: doc, action };
};

const ensureRevertable = (changeset: Doc<'changesets'>) => {
	if (changeset.deleted.length > 0 || changeset.renamed.length > 0) {
		throw new Error('This MVP can revert created and updated paths, but not deleted or renamed paths yet.');
	}
};

const collectCreatedFiles = async (ctx: MutationCtx, { owner, entries }: { owner: Id<'users'>; entries: Change[] }) => {
	const files: FileDoc[] = [];

	for (const entry of entries) {
		if (!entry.file) continue;
		const file = await ctx.db.get(entry.file);
		if (!file || file.owner !== owner || file.isDeleted) continue;
		if (file.kind === 'file' && entry.afterRevision && file.currentRevision !== entry.afterRevision) {
			throw new Error(`${entry.path} changed after this changeset; refusing to overwrite newer work.`);
		}
		if (file.kind === 'folder') {
			const child = await ctx.db
				.query('files')
				.withIndex('by_owner_parent_isDeleted', (q) =>
					q
						.eq('owner', owner) //
						.eq('parent', file._id)
						.eq('isDeleted', false),
				)
				.first();
			if (child) throw new Error(`${entry.path} has children; remove or revert those changes first.`);
		}
		files.push(file);
	}

	return files;
};

const collectRestores = async (ctx: MutationCtx, { owner, entries }: { owner: Id<'users'>; entries: Change[] }) => {
	const restores: Restore[] = [];

	for (const entry of entries) {
		if (!entry.file) continue;
		const file = await ctx.db.get(entry.file);
		if (!file || file.owner !== owner || file.isDeleted) {
			throw new Error(`${entry.path} is no longer available to revert.`);
		}
		if (file.kind !== 'file') throw new Error(`${entry.path} is not a file.`);
		const restoresMetadata = entry.beforeMetadata !== undefined || entry.afterMetadata !== undefined;
		const restoresContent =
			entry.beforeRevision !== undefined ||
			entry.afterRevision !== undefined ||
			entry.beforeContent !== undefined ||
			entry.afterContent !== undefined;
		if (entry.afterRevision && file.currentRevision !== entry.afterRevision) {
			throw new Error(`${entry.path} changed after this changeset; refusing to overwrite newer work.`);
		}

		const currentContent = await readRevisionContent(ctx, file.currentRevision);
		if (!restoresContent && restoresMetadata) {
			if (entry.afterMetadata !== undefined && !metadataEqual(file.metadata, entry.afterMetadata)) {
				throw new Error(
					`${entry.path} metadata changed after this changeset; refusing to overwrite newer work.`,
				);
			}
			restores.push({
				file,
				restoreMetadata: entry.beforeMetadata ?? {},
				currentMetadata: file.metadata ?? {},
			});
			continue;
		}

		const restoreContent = entry.beforeContent ?? (await readRevisionContent(ctx, entry.beforeRevision)) ?? '';
		restores.push({ file, restoreContent, currentContent });
	}

	return restores;
};

const deleteCreatedFiles = async (ctx: MutationCtx, { files }: { files: FileDoc[] }) => {
	const deleted: Change[] = [];

	for (const file of files) {
		const beforeContent = file.kind === 'file' ? await readRevisionContent(ctx, file.currentRevision) : undefined;
		await ctx.db.patch(file._id, {
			isDeleted: true,
			updatedAt: now(),
		});
		deleted.push({
			path: file.path,
			file: file._id,
			beforeRevision: file.currentRevision,
			beforeContent,
			afterRevision: undefined,
		});
	}

	return deleted;
};

const restoreUpdates = async (
	ctx: MutationCtx,
	{
		owner,
		directory,
		action,
		restores,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		action: Id<'actions'>;
		restores: Restore[];
	},
) => {
	const updated: Change[] = [];

	for (const restore of restores) {
		if ('restoreMetadata' in restore) {
			await ctx.db.patch(restore.file._id, {
				metadata: restore.restoreMetadata,
				updatedAt: now(),
			});
			updated.push({
				path: restore.file.path,
				file: restore.file._id,
				beforeMetadata: restore.currentMetadata,
				afterMetadata: restore.restoreMetadata,
			});
			continue;
		}

		const revision = await insertRevision(ctx, {
			owner,
			file: restore.file._id,
			directory,
			action,
			content: restore.restoreContent,
			contentType: restore.file.contentType,
			previousRevision: restore.file.currentRevision,
			beforePath: restore.file.path,
			afterPath: restore.file.path,
			beforeContent: restore.currentContent,
			changeKind: 'updated',
			patchKind: 'text',
		});
		updated.push({
			path: restore.file.path,
			file: restore.file._id,
			beforeRevision: restore.file.currentRevision,
			afterRevision: revision,
			beforeContent: restore.currentContent,
			afterContent: restore.restoreContent,
		});
	}

	return updated;
};

export const revertChangeset = async (ctx: MutationCtx, { changeset }: { changeset: Id<'changesets'> }) => {
	const currentUser = await getCurrentUser(ctx, {});
	const original = await ctx.db.get(changeset);
	if (!original || original.owner !== currentUser._id) throw NotFound();

	const action = await startAction(ctx, {
		owner: currentUser._id,
		directory: original.directory,
		author: { kind: 'user', user: currentUser._id },
		depth: 0,
		skillKey: 'revertChangeset',
		args: { changeset },
	});

	const finish = async (status: 'succeeded' | 'failed' | 'skipped', error?: string) => {
		await finishAction(ctx, {
			action,
			status,
			error,
		});
		return action;
	};

	try {
		if (original.reviewState === 'reverted') return await finish('skipped');
		ensureRevertable(original);

		const createdFiles = await collectCreatedFiles(ctx, {
			owner: currentUser._id,
			entries: original.created,
		});
		const restores = await collectRestores(ctx, {
			owner: currentUser._id,
			entries: original.updated,
		});
		const deleted = await deleteCreatedFiles(ctx, { files: createdFiles });
		const updated = await restoreUpdates(ctx, {
			owner: currentUser._id,
			directory: original.directory,
			action,
			restores,
		});

		if (deleted.length > 0 || updated.length > 0) {
			await insertChangeset(ctx, {
				owner: currentUser._id,
				directory: original.directory,
				action,
				created: [],
				updated,
				deleted,
			});
		}

		await ctx.db.patch(changeset, {
			reviewState: 'reverted',
			updatedAt: now(),
		});

		return await finish('succeeded');
	} catch (error) {
		return await finish('failed', error instanceof Error ? error.message : 'Failed to revert changeset');
	}
};
