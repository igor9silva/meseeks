import { z } from 'zod/v3';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { changedPathSchema } from 'schemas/workspaceSchema';
import { listAncestorDirectories } from './budgets.private';
import { proDirectoryName, rootPath } from './fileConstants.private';
import { ensureOwnedDirectory, ensureOwnedFile, findCurrentUserRootDirectory } from './ownership.private';
import { collectDescendantFiles, findPathForOwner, joinPath, relativePath } from './paths.private';
import { readRevisionContent } from './revisions.private';
import { routeConventionSeeds } from './routeConventions.private';
import { getCurrentUser } from './users.private';

type ChangedPath = z.infer<typeof changedPathSchema>;

const isProDirectory = (file: Doc<'files'>) => file.kind === 'folder' && file.name === proDirectoryName;

const compareChildren = (left: Doc<'files'>, right: Doc<'files'>) => {
	if (isProDirectory(left)) return -1;
	if (isProDirectory(right)) return 1;
	if (left.kind !== right.kind) return left.kind === 'folder' ? -1 : 1;
	return left.name.localeCompare(right.name);
};

const normalizeAbsolutePath = (path: string) => {
	const normalized = `/${path
		.split('/')
		.map((part) => part.trim())
		.filter(Boolean)
		.join('/')}`;
	return normalized === '//' ? rootPath : normalized;
};

const getRoutePageCandidatePaths = (path: string) => {
	const directPagePath = path === rootPath ? '/page.tsx' : joinPath(path, 'page.tsx');
	const parts = path
		.split('/')
		.map((part) => part.trim())
		.filter(Boolean);
	const candidates = [directPagePath];
	if (parts.length === 2 && parts[0] === 'tasks') candidates.push('/tasks/[id]/page.tsx');
	if (parts.length === 2 && parts[0] === 'action') candidates.push('/action/[id]/page.tsx');
	return candidates;
};

const findCanonicalPathForOwner = async (
	ctx: QueryCtx,
	{
		owner,
		path,
	}: {
		owner: Id<'users'>;
		path: string;
	},
) => {
	const direct = await findPathForOwner(ctx, { owner, path });
	if (direct) return { file: direct, path };

	const parts = path.split('/').filter(Boolean);
	for (let index = 1; index < parts.length; index += 1) {
		if (parts[index] !== parts[0]) continue;
		const candidatePath = `/${parts.slice(index).join('/')}`;
		const candidate = await findPathForOwner(ctx, { owner, path: candidatePath });
		if (candidate) return { file: candidate, path: candidatePath };
	}

	return {
		file: null,
		path,
	};
};

const listChildrenForOwner = async (
	ctx: QueryCtx,
	{
		owner,
		parent,
	}: {
		owner: Id<'users'>;
		parent: Id<'files'>;
	},
) => {
	const children = await ctx.db
		.query('files')
		.withIndex('by_owner_parent_isDeleted', (q) =>
			q
				.eq('owner', owner) //
				.eq('parent', parent)
				.eq('isDeleted', false),
		)
		.collect();

	return children.sort(compareChildren);
};

const changedPathsContainFile = (changes: ChangedPath[], file: Id<'files'>) =>
	changes.some((change) => change.file === file);

export const listChildren = async (ctx: QueryCtx, { parent }: { parent: Id<'files'> }) => {
	const currentUser = await getCurrentUser(ctx, {});
	await ensureOwnedDirectory(ctx, { directory: parent, owner: currentUser._id });

	return await listChildrenForOwner(ctx, { owner: currentUser._id, parent });
};

export const getNavigationContext = async (ctx: QueryCtx, { path }: { path: string }) => {
	const existing = await findCurrentUserRootDirectory(ctx);
	if (!existing.root) return null;

	const cleanPath = normalizeAbsolutePath(path);
	const resolved = await findCanonicalPathForOwner(ctx, {
		owner: existing.currentUser._id,
		path: cleanPath,
	});
	const current = resolved.file;
	let directory = existing.root;
	if (current?.kind === 'folder') {
		directory = current;
	}
	if (current?.kind === 'file' && current.parent) {
		directory = await ensureOwnedDirectory(ctx, { directory: current.parent, owner: existing.currentUser._id });
	}
	const branch = await listAncestorDirectories(ctx, { owner: existing.currentUser._id, directory: directory._id });
	branch.reverse();

	const seen = new Set<Id<'files'>>();
	const visibleFolders: Doc<'files'>[] = [];
	for (const folder of branch) {
		if (seen.has(folder._id)) continue;
		visibleFolders.push(folder);
		seen.add(folder._id);
	}

	const childrenByParent = [];
	for (const folder of visibleFolders) {
		childrenByParent.push({
			parent: folder._id,
			children: await listChildrenForOwner(ctx, { owner: existing.currentUser._id, parent: folder._id }),
		});
	}

	return {
		requestedPath: cleanPath,
		canonicalPath: resolved.path,
		root: existing.root,
		current,
		directory,
		branch,
		childrenByParent,
	};
};

export const getRootDirectory = async (ctx: QueryCtx | MutationCtx) => {
	const existing = await findCurrentUserRootDirectory(ctx);
	if (!existing.root) return null;
	return {
		root: existing.root,
	};
};

export const getRouteConventionState = async (ctx: QueryCtx, { directory }: { directory: Id<'files'> }) => {
	const currentUser = await getCurrentUser(ctx, {});
	await ensureOwnedDirectory(ctx, { directory, owner: currentUser._id });
	const missing: string[] = [];

	for (const seed of routeConventionSeeds) {
		const existing = await findPathForOwner(ctx, {
			owner: currentUser._id,
			path: seed.path,
		});
		if (!existing) missing.push(seed.path);
	}

	return {
		isSeeded: missing.length === 0,
		missing,
	};
};

export const getRoutePage = async (ctx: QueryCtx, { path }: { path: string }) => {
	const currentUser = await getCurrentUser(ctx, {});
	const cleanPath = normalizeAbsolutePath(path);
	const resolved = await findCanonicalPathForOwner(ctx, {
		owner: currentUser._id,
		path: cleanPath,
	});
	const routePaths = [cleanPath];
	if (resolved.path !== cleanPath) routePaths.push(resolved.path);

	for (const routePath of routePaths) {
		for (const candidate of getRoutePageCandidatePaths(routePath)) {
			const file = await findPathForOwner(ctx, {
				owner: currentUser._id,
				path: candidate,
			});
			if (!file) continue;
			if (file.kind !== 'file') throw new Error(`${file.path} must be a file`);
			return {
				file,
				directory: file.parent ?? file._id,
				matchedPath: candidate,
				canonicalPath: routePath,
				content: await readRevisionContent(ctx, file.currentRevision),
			};
		}
	}

	const fallbackFile = resolved.file;
	if (fallbackFile?.kind === 'file') {
		return {
			file: fallbackFile,
			directory: fallbackFile.parent ?? fallbackFile._id,
			matchedPath: resolved.path,
			canonicalPath: resolved.path,
			content: await readRevisionContent(ctx, fallbackFile.currentRevision),
		};
	}

	return {
		file: null,
		directory: null,
		matchedPath: getRoutePageCandidatePaths(cleanPath)[0],
		canonicalPath: cleanPath,
		content: undefined,
	};
};

export const getFile = async (ctx: QueryCtx, { file }: { file: Id<'files'> }) => {
	const currentUser = await getCurrentUser(ctx, {});
	return await ensureOwnedFile(ctx, { file, owner: currentUser._id });
};

export const getFileByPath = async (ctx: QueryCtx, { path }: { path: string }) => {
	const currentUser = await getCurrentUser(ctx, {});
	const cleanPath = normalizeAbsolutePath(path);
	const file = await findPathForOwner(ctx, {
		owner: currentUser._id,
		path: cleanPath,
	});

	return {
		file,
	};
};

export const getFileContent = async (ctx: QueryCtx, { file }: { file: Id<'files'> }) => {
	const currentUser = await getCurrentUser(ctx, {});
	const doc = await ensureOwnedFile(ctx, { file, owner: currentUser._id });
	return {
		file: doc,
		content: await readRevisionContent(ctx, doc.currentRevision),
	};
};

export const getFileContentType = async (
	ctx: QueryCtx,
	{
		owner,
		file,
	}: {
		owner: Id<'users'>;
		file: Id<'files'>;
	},
) => {
	const doc = await ensureOwnedFile(ctx, { file, owner });
	return {
		contentType: doc.contentType,
	};
};

export const getRouteConventionStorageEntries = async (
	ctx: QueryCtx,
	{
		owner,
		directory,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
	},
) => {
	await ensureOwnedDirectory(ctx, { directory, owner });
	const missing = [];
	for (const seed of routeConventionSeeds) {
		const existing = await findPathForOwner(ctx, {
			owner,
			path: seed.path,
		});
		if (!existing) missing.push(seed);
	}

	return missing;
};

export const listRevisions = async (ctx: QueryCtx, { file }: { file: Id<'files'> }) => {
	const currentUser = await getCurrentUser(ctx, {});
	await ensureOwnedFile(ctx, { file, owner: currentUser._id });

	return await ctx.db
		.query('file_revisions')
		.withIndex('by_file', (q) => q.eq('file', file))
		.order('desc')
		.collect();
};

export const listTags = async (ctx: QueryCtx, { file }: { file: Id<'files'> }) => {
	const currentUser = await getCurrentUser(ctx, {});
	await ensureOwnedFile(ctx, { file, owner: currentUser._id });

	return await ctx.db
		.query('file_tags')
		.withIndex('by_file_key', (q) => q.eq('file', file))
		.collect();
};

export const listActionsForFile = async (ctx: QueryCtx, { file }: { file: Id<'files'> }) => {
	const currentUser = await getCurrentUser(ctx, {});
	const doc = await ensureOwnedFile(ctx, { file, owner: currentUser._id });
	const directory = doc.kind === 'folder' ? doc._id : doc.parent;
	if (!directory) return [];

	const ancestors = await listAncestorDirectories(ctx, { owner: currentUser._id, directory });
	const actionIds: Id<'actions'>[] = [];
	for (const ancestor of ancestors) {
		const changesets = await ctx.db
			.query('changesets')
			.withIndex('by_directory', (q) => q.eq('directory', ancestor._id))
			.order('desc')
			.collect();
		for (const changeset of changesets) {
			if (
				changedPathsContainFile(changeset.created, file) ||
				changedPathsContainFile(changeset.updated, file) ||
				changedPathsContainFile(changeset.deleted, file)
			) {
				actionIds.push(changeset.action);
			}
		}
	}

	const actions = [];
	for (const action of actionIds) {
		const docAction = await ctx.db.get(action);
		if (docAction && docAction.owner === currentUser._id) actions.push(docAction);
	}

	return actions;
};

export const getDirectoryTree = async (
	ctx: QueryCtx,
	{ owner, directory }: { owner: Id<'users'>; directory: Id<'files'> },
) => {
	const root = await ensureOwnedDirectory(ctx, { directory, owner });
	const files = await collectDescendantFiles(ctx, { owner, directory });
	const tree = [];

	for (const file of files) {
		if (file._id === root._id) continue;
		const revision = file.currentRevision ? await ctx.db.get(file.currentRevision) : null;
		tree.push({
			file: {
				_id: file._id,
				kind: file.kind,
				currentRevision: file.currentRevision,
				hash: file.hash,
				size: file.size,
				contentType: file.contentType,
			},
			relativePath: relativePath(root, file),
			content: file.kind === 'file' ? await readRevisionContent(ctx, file.currentRevision) : undefined,
			storageKey: revision?.storageKey,
		});
	}

	return { root, tree };
};

export const resolveActionDirectory = async (
	ctx: QueryCtx,
	{
		owner,
		directory,
	}: {
		owner: Id<'users'>;
		directory?: Id<'files'>;
	},
) => {
	if (directory) return await ensureOwnedDirectory(ctx, { directory, owner });

	const root = await ctx.db
		.query('files')
		.withIndex('by_owner_parent_isDeleted', (q) =>
			q
				.eq('owner', owner) //
				.eq('parent', undefined)
				.eq('isDeleted', false),
		)
		.filter((q) => q.and(q.eq(q.field('path'), rootPath), q.eq(q.field('kind'), 'folder')))
		.first();
	if (!root) throw new Error('Root directory has not been created.');
	return root;
};
