import { z } from 'zod/v3';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { changedPathSchema } from 'schemas/workspaceSchema';
import { proDirectoryName, rootPath, settingsFileName } from './fileConstants.private';
import { insertChangeset } from './changes.private';
import { metadataEqual } from './metadata.private';
import { ensureOwnedDirectory, ensureOwnedFile, findCurrentUserRootDirectory } from './ownership.private';
import { findChildByName, joinPath, normalizeName } from './paths.private';
import { insertRevision, readRevisionContent } from './revisions.private';
import { now } from './time.private';

const settingsSchema = z.object({
	title: z.string().min(1).optional(),
});

type ChangedPath = z.infer<typeof changedPathSchema>;

type EnsureFolderWithChangesetArgs = {
	owner: Id<'users'>;
	directory: Id<'files'>;
	parent: Id<'files'>;
	name: string;
	action: Id<'actions'>;
};

type CreateFileWithChangesetArgs = {
	owner: Id<'users'>;
	directory: Id<'files'>;
	parent: Id<'files'>;
	name: string;
	content: string;
	storageKey: string;
	contentType?: string;
	action: Id<'actions'>;
};

const parseSettingsTitle = (content: string) => {
	let value: unknown;
	try {
		value = JSON.parse(content);
	} catch {
		return undefined;
	}
	const parsed = settingsSchema.safeParse(value);
	if (!parsed.success) return undefined;
	return parsed.data.title;
};

const maybePatchDirectoryTitleFromSettings = async (
	ctx: MutationCtx,
	{
		owner,
		file,
		content,
	}: {
		owner: Id<'users'>;
		file: Doc<'files'>;
		content: string;
	},
) => {
	if (file.name !== settingsFileName || !file.parent) return;
	const parent = await ensureOwnedFile(ctx, { file: file.parent, owner });
	if (parent.name !== proDirectoryName || !parent.parent) return;
	const title = parseSettingsTitle(content);
	await ctx.db.patch(parent.parent, {
		title,
		updatedAt: now(),
	});
};

export const createFolderDirect = async (
	ctx: MutationCtx,
	{
		owner,
		parent,
		name,
		patch,
	}: {
		owner: Id<'users'>;
		parent: Doc<'files'>;
		name: string;
		patch?: {
			title?: string;
			availableSkillKeys?: string[];
			budgetTotal?: number;
			budgetAvailable?: number;
			budgetReserved?: number;
		};
	},
) => {
	if (parent.kind !== 'folder') throw new Error('Parent must be a folder');
	const cleanName = normalizeName(name);
	const at = now();
	return await ctx.db.insert('files', {
		owner,
		parent: parent._id,
		name: cleanName,
		path: joinPath(parent.path, cleanName),
		kind: 'folder',
		isDeleted: false,
		metadata: {},
		title: patch?.title,
		availableSkillKeys: patch?.availableSkillKeys,
		budgetTotal: patch?.budgetTotal,
		budgetAvailable: patch?.budgetAvailable,
		budgetReserved: patch?.budgetReserved,
		createdAt: at,
		updatedAt: at,
	});
};

export const createFolderWithRevisionDirect = async (
	ctx: MutationCtx,
	{
		owner,
		directory,
		parent,
		name,
		action,
		patch,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		parent: Doc<'files'>;
		name: string;
		action: Id<'actions'>;
		patch?: {
			title?: string;
			availableSkillKeys?: string[];
			budgetTotal?: number;
			budgetAvailable?: number;
			budgetReserved?: number;
		};
	},
) => {
	const folder = await createFolderDirect(ctx, {
		owner,
		parent,
		name,
		patch,
	});
	const folderDoc = await ensureOwnedDirectory(ctx, { directory: folder, owner });
	const revision = await insertRevision(ctx, {
		owner,
		file: folder,
		directory,
		action,
		content: '',
		contentType: 'inode/directory',
		beforePath: undefined,
		afterPath: folderDoc.path,
		afterMetadata: { kind: 'folder' },
		changeKind: 'created',
		patchKind: 'metadata',
	});

	return {
		file: folder,
		doc: folderDoc,
		change: {
			path: folderDoc.path,
			file: folder,
			afterRevision: revision,
			afterMetadata: { kind: 'folder' },
		},
	};
};

export const createFileDirect = async (
	ctx: MutationCtx,
	{
		owner,
		directory,
		parent,
		name,
		content,
		storageKey,
		contentType,
		action,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		parent: Doc<'files'>;
		name: string;
		content: string;
		storageKey: string;
		contentType?: string;
		action: Id<'actions'>;
	},
) => {
	const cleanName = normalizeName(name);
	const at = now();
	const file = await ctx.db.insert('files', {
		owner,
		parent: parent._id,
		name: cleanName,
		path: joinPath(parent.path, cleanName),
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
		action,
		content,
		storageKey,
		contentType,
		beforePath: undefined,
		afterPath: joinPath(parent.path, cleanName),
		changeKind: 'created',
		patchKind: 'full',
	});
	const fileDoc = await ensureOwnedFile(ctx, { file, owner });
	await maybePatchDirectoryTitleFromSettings(ctx, { owner, file: fileDoc, content });

	return {
		file,
		change: {
			path: joinPath(parent.path, cleanName),
			file,
			afterRevision: revision,
			afterContent: content,
		},
	};
};

export const ensureRootDirectory = async (ctx: MutationCtx) => {
	const existing = await findCurrentUserRootDirectory(ctx);
	if (existing.root) {
		if (existing.currentUser.rootFile !== existing.root._id) {
			await ctx.db.patch(existing.currentUser._id, {
				rootFile: existing.root._id,
			});
		}
		return { currentUser: existing.currentUser, root: existing.root };
	}

	const at = now();
	const root = await ctx.db.insert('files', {
		owner: existing.currentUser._id,
		name: 'Root',
		path: rootPath,
		kind: 'folder',
		title: 'Root',
		isDeleted: false,
		metadata: {},
		createdAt: at,
		updatedAt: at,
	});
	await ctx.db.patch(existing.currentUser._id, {
		rootFile: root,
	});
	const rootDoc = await ensureOwnedDirectory(ctx, { directory: root, owner: existing.currentUser._id });
	return { currentUser: existing.currentUser, root: rootDoc };
};

export const ensureFolderWithChangeset = async (
	ctx: MutationCtx,
	{ owner, directory, parent, name, action }: EnsureFolderWithChangesetArgs,
) => {
	await ensureOwnedDirectory(ctx, { directory, owner });
	const parentDoc = await ensureOwnedDirectory(ctx, { directory: parent, owner });
	const cleanName = normalizeName(name);
	const existing = await findChildByName(ctx, { owner, parent, name: cleanName });
	if (existing) return { file: existing._id, changedFiles: [] };

	const folder = await createFolderWithRevisionDirect(ctx, {
		owner,
		directory,
		parent: parentDoc,
		name: cleanName,
		action,
	});
	await insertChangeset(ctx, {
		owner,
		directory,
		action,
		created: [folder.change],
		updated: [],
	});

	return { file: folder.file, changedFiles: [folder.change.path] };
};

export const createFileWithChangeset = async (
	ctx: MutationCtx,
	{ owner, directory, parent, name, content, storageKey, contentType, action }: CreateFileWithChangesetArgs,
) => {
	await ensureOwnedDirectory(ctx, { directory, owner });
	const parentDoc = await ensureOwnedDirectory(ctx, { directory: parent, owner });
	const cleanName = normalizeName(name);
	const existing = await findChildByName(ctx, { owner, parent, name: cleanName });
	if (existing) throw new Error(`File already exists at ${existing.path}`);

	const created = await createFileDirect(ctx, {
		owner,
		directory,
		parent: parentDoc,
		name: cleanName,
		content,
		storageKey,
		contentType,
		action,
	});

	await insertChangeset(ctx, {
		owner,
		directory,
		action,
		created: [created.change],
		updated: [],
	});

	return { file: created.file, changedFiles: [created.change.path] };
};

export const writeFile = async (
	ctx: MutationCtx,
	{
		owner,
		directory,
		file,
		content,
		storageKey,
		contentType,
		action,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		file: Id<'files'>;
		content: string;
		storageKey: string;
		contentType?: string;
		action: Id<'actions'>;
	},
) => {
	await ensureOwnedDirectory(ctx, { directory, owner });
	const fileDoc = await ensureOwnedFile(ctx, { file, owner });
	if (fileDoc.kind !== 'file') throw new Error('Target must be a file');

	const previousContent = await readRevisionContent(ctx, fileDoc.currentRevision);
	if ((previousContent ?? '') === content) return { file, changedFiles: [] };
	const previousRevision = fileDoc.currentRevision ? await ctx.db.get(fileDoc.currentRevision) : null;

	const revision = await insertRevision(ctx, {
		owner,
		file,
		directory,
		action,
		content,
		storageKey,
		contentType: contentType ?? fileDoc.contentType,
		previousRevision: fileDoc.currentRevision,
		beforePath: fileDoc.path,
		afterPath: fileDoc.path,
		beforeContent: previousContent,
		changeKind: 'updated',
		patchKind: 'text',
	});
	await maybePatchDirectoryTitleFromSettings(ctx, { owner, file: fileDoc, content });

	await insertChangeset(ctx, {
		owner,
		directory,
		action,
		created: [],
		updated: [
			{
				path: fileDoc.path,
				file,
				beforeRevision: fileDoc.currentRevision,
				afterRevision: revision,
				beforeContent: previousContent,
				afterContent: content,
			},
		],
	});

	return { file, changedFiles: [fileDoc.path], previousStorageKey: previousRevision?.storageKey };
};

export const updateFileMetadata = async (
	ctx: MutationCtx,
	{
		owner,
		directory,
		file,
		action,
		metadata,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		file: Id<'files'>;
		action: Id<'actions'>;
		metadata: Record<string, string>;
	},
) => {
	await ensureOwnedDirectory(ctx, { directory, owner });
	const fileDoc = await ensureOwnedFile(ctx, { file, owner });
	const previousMetadata = fileDoc.metadata ?? {};
	if (metadataEqual(previousMetadata, metadata)) return { file, changedFiles: [] };
	const currentContent = await readRevisionContent(ctx, fileDoc.currentRevision);
	const revision = await insertRevision(ctx, {
		owner,
		file,
		directory,
		action,
		content: currentContent,
		storageKey: undefined,
		contentType: fileDoc.contentType,
		previousRevision: fileDoc.currentRevision,
		beforePath: fileDoc.path,
		afterPath: fileDoc.path,
		beforeMetadata: previousMetadata,
		afterMetadata: metadata,
		changeKind: 'metadata',
		patchKind: 'metadata',
	});

	await ctx.db.patch(file, {
		metadata,
		updatedAt: now(),
	});

	await insertChangeset(ctx, {
		owner,
		directory,
		action,
		created: [],
		updated: [
			{
				path: fileDoc.path,
				file,
				beforeRevision: fileDoc.currentRevision,
				afterRevision: revision,
				beforeMetadata: previousMetadata,
				afterMetadata: metadata,
			},
		],
	});

	return { file, changedFiles: [fileDoc.path] };
};

export const tagFile = async (
	ctx: MutationCtx,
	{
		owner,
		directory,
		file,
		key,
		value,
		action,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		file: Id<'files'>;
		key: string;
		value?: string;
		action: Id<'actions'>;
	},
) => {
	await ensureOwnedDirectory(ctx, { directory, owner });
	const fileDoc = await ensureOwnedFile(ctx, { file, owner });
	const existing = await ctx.db
		.query('file_tags')
		.withIndex('by_file_key', (q) =>
			q
				.eq('file', file) //
				.eq('key', key),
		)
		.first();

	const previousMetadata = {
		[`tag:${key}`]: existing?.value ?? '',
	};
	const nextMetadata = {
		[`tag:${key}`]: value ?? '',
	};
	const currentContent = await readRevisionContent(ctx, fileDoc.currentRevision);
	const revision = await insertRevision(ctx, {
		owner,
		file,
		directory,
		action,
		content: currentContent,
		contentType: fileDoc.contentType,
		previousRevision: fileDoc.currentRevision,
		beforePath: fileDoc.path,
		afterPath: fileDoc.path,
		beforeMetadata: previousMetadata,
		afterMetadata: nextMetadata,
		changeKind: 'tagged',
		patchKind: 'metadata',
	});

	if (existing) {
		await ctx.db.patch(existing._id, {
			value,
			updatedAt: now(),
		});
		await insertChangeset(ctx, {
			owner,
			directory,
			action,
			created: [],
			updated: [
				{
					path: fileDoc.path,
					file,
					beforeRevision: fileDoc.currentRevision,
					afterRevision: revision,
					beforeMetadata: previousMetadata,
					afterMetadata: nextMetadata,
				},
			],
		});
		return existing._id;
	}

	const tag = await ctx.db.insert('file_tags', {
		owner,
		file,
		key,
		value,
		createdAt: now(),
		updatedAt: now(),
	});
	await insertChangeset(ctx, {
		owner,
		directory,
		action,
		created: [],
		updated: [
			{
				path: fileDoc.path,
				file,
				beforeRevision: fileDoc.currentRevision,
				afterRevision: revision,
				beforeMetadata: previousMetadata,
				afterMetadata: nextMetadata,
			},
		],
	});
	return tag;
};

export type ProChangedPath = ChangedPath;
