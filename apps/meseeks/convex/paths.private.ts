import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { NotFound } from 'lib/errors';
import { rootPath } from './fileConstants.private';
import { ensureOwnedDirectory } from './ownership.private';
import { now } from './time.private';

export const normalizeName = (name: string) => {
	const normalized = name.trim().replaceAll('/', '-');
	if (!normalized) throw new Error('File name is required');
	if (normalized === '.' || normalized === '..') throw new Error('Invalid file name');
	return normalized;
};

export const normalizeRelativePath = (path: string) => {
	const parts = path
		.split('/')
		.map((part) => part.trim())
		.filter(Boolean);
	return parts.join('/');
};

export const joinPath = (parentPath: string, name: string) => {
	const cleanName = normalizeName(name);
	return parentPath === rootPath ? `/${cleanName}` : `${parentPath}/${cleanName}`;
};

export const relativePath = (directory: Doc<'files'>, file: Doc<'files'>) => {
	if (file._id === directory._id) return '';
	if (directory.path === rootPath) return file.path.slice(1);
	return file.path.slice(directory.path.length + 1);
};

export const isDescendantOrSelf = (directory: Doc<'files'>, file: Doc<'files'>) =>
	file._id === directory._id || file.path.startsWith(`${directory.path === rootPath ? '' : directory.path}/`);

export const findChildByName = async (
	ctx: QueryCtx | MutationCtx,
	{
		owner,
		parent,
		name,
	}: {
		owner: Id<'users'>;
		parent: Id<'files'>;
		name: string;
	},
) =>
	await ctx.db
		.query('files')
		.withIndex('by_owner_parent_name', (q) =>
			q
				.eq('owner', owner) //
				.eq('parent', parent)
				.eq('name', name),
		)
		.filter((q) => q.eq(q.field('isDeleted'), false))
		.first();

export const findPathForOwner = async (
	ctx: QueryCtx | MutationCtx,
	{
		owner,
		path,
	}: {
		owner: Id<'users'>;
		path: string;
	},
) =>
	await ctx.db
		.query('files')
		.withIndex('by_owner_path', (q) =>
			q
				.eq('owner', owner) //
				.eq('path', path),
		)
		.filter((q) => q.eq(q.field('isDeleted'), false))
		.first();

export const ensureFolderPath = async (
	ctx: MutationCtx,
	{
		owner,
		root,
		parts,
	}: {
		owner: Id<'users'>;
		root: Doc<'files'>;
		parts: string[];
	},
) => {
	let parent = root;
	for (const part of parts) {
		const existing = await findChildByName(ctx, { owner, parent: parent._id, name: part });
		if (existing) {
			if (existing.kind !== 'folder') throw new Error(`${existing.path} is not a folder`);
			parent = existing;
			continue;
		}

		const at = now();
		const folderId = await ctx.db.insert('files', {
			owner,
			parent: parent._id,
			name: part,
			path: joinPath(parent.path, part),
			kind: 'folder',
			isDeleted: false,
			metadata: {},
			createdAt: at,
			updatedAt: at,
		});

		const folder = await ctx.db.get(folderId);
		if (!folder) throw NotFound();
		parent = folder;
	}

	return parent;
};

export const collectDescendantFiles = async (
	ctx: QueryCtx | MutationCtx,
	{ owner, directory }: { owner: Id<'users'>; directory: Id<'files'> },
) => {
	const root = await ensureOwnedDirectory(ctx, { directory, owner });
	const result: Doc<'files'>[] = [root];
	let frontier: Doc<'files'>[] = [root];

	while (frontier.length > 0) {
		const nextFrontier: Doc<'files'>[] = [];
		for (const parent of frontier) {
			const children = await ctx.db
				.query('files')
				.withIndex('by_owner_parent_isDeleted', (q) =>
					q
						.eq('owner', owner) //
						.eq('parent', parent._id)
						.eq('isDeleted', false),
				)
				.collect();
			result.push(...children);
			nextFrontier.push(...children.filter((child) => child.kind === 'folder'));
		}
		frontier = nextFrontier;
	}

	return result;
};
