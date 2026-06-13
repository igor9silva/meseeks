import { z } from 'zod/v3';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { changedPathSchema } from 'schemas/workspaceSchema';
import { insertChangeset } from './changes.private';
import { rootPath } from './fileConstants.private';
import { ensureOwnedDirectory } from './ownership.private';
import { ensureFolderPath, findPathForOwner, joinPath, normalizeName, normalizeRelativePath } from './paths.private';
import { insertRevision, readRevisionContent } from './revisions.private';
import { now } from './time.private';

type Change = z.infer<typeof changedPathSchema>;

export const applyExecutionScan = async (
	ctx: MutationCtx,
	{
		owner,
		directory,
		action,
		files,
		deletedPaths,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		action: Id<'actions'>;
		deletedPaths: Array<{
			path: string;
			expectedRevision?: Id<'file_revisions'>;
			beforeContent?: string;
		}>;
		files: Array<{
			path: string;
			content: string;
			storageKey: string;
			contentType?: string;
			expectedRevision?: Id<'file_revisions'>;
			beforeContent?: string;
		}>;
	},
) => {
	const root = await ensureOwnedDirectory(ctx, { directory, owner });
	const created: Change[] = [];
	const updated: Change[] = [];
	const deleted: Change[] = [];
	const previousStorageKeys: string[] = [];
	const unusedStorageKeys: string[] = [];
	const conflicts: string[] = [];

	for (const entry of deletedPaths) {
		const cleanPath = normalizeRelativePath(entry.path);
		if (!cleanPath || shouldIgnore(cleanPath)) continue;
		const fullPath = root.path === rootPath ? `/${cleanPath}` : `${root.path}/${cleanPath}`;
		const existing = await findPathForOwner(ctx, { owner, path: fullPath });
		if (!existing || existing.kind !== 'file') continue;
		if (existing.currentRevision !== entry.expectedRevision) {
			conflicts.push(`${cleanPath} changed before the box transaction could be applied.`);
			continue;
		}
		const beforeContent = await readRevisionContent(ctx, existing.currentRevision);
		const previousRevision = existing.currentRevision ? await ctx.db.get(existing.currentRevision) : null;
		if (previousRevision?.storageKey) previousStorageKeys.push(previousRevision.storageKey);
		const revision = await insertRevision(ctx, {
			owner,
			file: existing._id,
			directory,
			action,
			content: '',
			contentType: existing.contentType,
			previousRevision: existing.currentRevision,
			beforePath: existing.path,
			afterPath: existing.path,
			beforeContent: entry.beforeContent ?? beforeContent,
			changeKind: 'deleted',
			patchKind: 'full',
		});
		await ctx.db.patch(existing._id, {
			isDeleted: true,
			updatedAt: now(),
		});
		deleted.push({
			path: existing.path,
			file: existing._id,
			beforeRevision: existing.currentRevision,
			afterRevision: revision,
			beforeContent: entry.beforeContent ?? beforeContent,
		});
	}

	for (const entry of files) {
		const cleanPath = normalizeRelativePath(entry.path);
		if (!cleanPath || shouldIgnore(cleanPath)) continue;

		const pathParts = cleanPath.split('/');
		const fileName = normalizeName(pathParts[pathParts.length - 1] ?? '');
		const folders = pathParts.slice(0, -1).map(normalizeName);
		const parent = await ensureFolderPath(ctx, {
			owner,
			root,
			parts: folders,
		});
		const fullPath = joinPath(parent.path, fileName);
		const existing = await findPathForOwner(ctx, { owner, path: fullPath });

		if (!existing) {
			if (entry.expectedRevision) {
				unusedStorageKeys.push(entry.storageKey);
				conflicts.push(`${cleanPath} was deleted before the box transaction could be applied.`);
				continue;
			}
			const at = now();
			const file = await ctx.db.insert('files', {
				owner,
				parent: parent._id,
				name: fileName,
				path: fullPath,
				kind: 'file',
				isDeleted: false,
				metadata: {},
				createdAt: at,
				updatedAt: at,
			});
			const revision = await insertRevision(ctx, {
				owner,
				file,
				directory,
				content: entry.content,
				storageKey: entry.storageKey,
				contentType: entry.contentType,
				action,
				beforePath: undefined,
				afterPath: fullPath,
				changeKind: 'created',
				patchKind: 'full',
			});
			created.push({
				path: fullPath,
				file,
				afterRevision: revision,
				afterContent: entry.content,
			});
			continue;
		}

		if (existing.kind !== 'file') {
			unusedStorageKeys.push(entry.storageKey);
			conflicts.push(`${cleanPath} is no longer a file.`);
			continue;
		}
		if (!entry.expectedRevision) {
			unusedStorageKeys.push(entry.storageKey);
			conflicts.push(`${cleanPath} was created by another action before the box transaction could be applied.`);
			continue;
		}
		if (existing.currentRevision !== entry.expectedRevision) {
			unusedStorageKeys.push(entry.storageKey);
			conflicts.push(`${cleanPath} changed before the box transaction could be applied.`);
			continue;
		}
		const beforeContent = await readRevisionContent(ctx, existing.currentRevision);
		if ((beforeContent ?? '') === entry.content) {
			unusedStorageKeys.push(entry.storageKey);
			continue;
		}
		const previousRevision = existing.currentRevision ? await ctx.db.get(existing.currentRevision) : null;
		if (previousRevision?.storageKey) previousStorageKeys.push(previousRevision.storageKey);

		const revision = await insertRevision(ctx, {
			owner,
			file: existing._id,
			directory,
			content: entry.content,
			storageKey: entry.storageKey,
			contentType: entry.contentType ?? existing.contentType,
			action,
			previousRevision: existing.currentRevision,
			beforePath: existing.path,
			afterPath: existing.path,
			beforeContent: entry.beforeContent ?? beforeContent,
			changeKind: 'updated',
			patchKind: 'text',
		});

		updated.push({
			path: existing.path,
			file: existing._id,
			beforeRevision: existing.currentRevision,
			afterRevision: revision,
			beforeContent: entry.beforeContent ?? beforeContent,
			afterContent: entry.content,
		});
	}

	const changedFiles = created.concat(updated, deleted).map((entry) => entry.path);
	if (created.length === 0 && updated.length === 0 && deleted.length === 0) {
		return {
			changeset: null,
			changedFiles,
			previousStorageKeys,
			unusedStorageKeys,
			conflicts,
		};
	}

	const changeset = await insertChangeset(ctx, {
		owner,
		directory,
		action,
		created,
		updated,
		deleted,
	});

	return {
		changeset,
		changedFiles,
		previousStorageKeys,
		unusedStorageKeys,
		conflicts,
	};
};

const shouldIgnore = (path: string) =>
	path.startsWith('.git/') || path.startsWith('.pro/') || path.includes('/node_modules/');
