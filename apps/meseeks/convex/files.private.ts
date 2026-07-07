import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Doc, Id } from 'convex/_generated/dataModel';
import type { MutationCtx, QueryCtx } from 'convex/_generated/server';
import { internal } from 'convex/_generated/api';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { enqueueAction } from './actions.private';
import { ensureInstinctSkillRows } from './skills.private';

export const findFile = defineQuery({
	args: z.object({
		file: zid('files'),
	}),
	handler: async (ctx, { file }) => {
		//
		const row = await ctx.db.get(file);
		if (!row) throw NotFound();

		return row;
	},
});

export const ensureFileOwner = defineQuery({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
	}),
	handler: async (ctx, { owner, file }) => {
		//
		const row = await findFile(ctx, { file });
		if (row.owner !== owner) throw NotFound();

		return row;
	},
});

export const ensureDirectoryOwner = defineQuery({
	args: z.object({
		owner: zid('users'),
		directory: zid('files'),
	}),
	handler: async (ctx, { owner, directory }) => {
		//
		const row = await findFile(ctx, { file: directory });
		if (row.owner !== owner) throw NotFound();
		if (row.kind !== 'directory') throw NotFound();

		return row;
	},
});

export const ensureScopeOwner = defineQuery({
	args: z.object({
		owner: zid('users'),
		directory: zid('files'),
	}),
	handler: async (ctx, { owner, directory }) => {
		//
		let current = await ensureDirectoryOwner(ctx, { owner, directory });
		const ancestors: Array<Doc<'files'>> = [];

		while (true) {
			ancestors.push(current);

			if (current.parent === 'root') break;

			current = await ensureDirectoryOwner(ctx, { owner, directory: current.parent });
		}

		for (const ancestor of ancestors) {
			if (ancestor.name !== '.pro') continue;
			if (ancestor.parent === 'root') throw NotFound();

			return await ensureDirectoryOwner(ctx, { owner, directory: ancestor.parent });
		}

		for (const ancestor of ancestors) {
			const control = await findControlDirectory(ctx, { owner, directory: ancestor._id });
			if (control) return ancestor;
		}

		const fallback = ancestors[ancestors.length - 1];
		if (!fallback) throw NotFound();

		return fallback;
	},
});

export const ensureUserRootDirectory = defineMutation({
	args: z.object({
		owner: zid('users'),
	}),
	handler: async (ctx, { owner }) => {
		//
		await ensureInstinctSkillRows(ctx, {});

		const user = await ctx.db.get(owner);
		if (!user) throw NotFound();
		if (user.root) return user.root;

		return await createUserRootDirectory(ctx, { owner });
	},
});

export const listFileChildren = defineQuery({
	args: z.object({
		owner: zid('users'),
		parent: zid('files'),
	}),
	handler: async (ctx, { owner, parent }) => {
		//
		await ensureDirectoryOwner(ctx, { owner, directory: parent });

		return await ctx.db
			.query('files')
			.withIndex('by_owner_parent_name', (q) =>
				q
					.eq('owner', owner) //
					.eq('parent', parent),
			)
			.collect();
	},
});

export async function listRuntimeSourceFiles(
	ctx: QueryCtx | MutationCtx,
	{ owner, root, limit = 300 }: { owner: Id<'users'>; root: Id<'files'>; limit?: number },
) {
	//
	await ensureDirectoryOwner(ctx, { owner, directory: root });

	const queue: Array<{ directory: Id<'files'>; path: string }> = [{ directory: root, path: '/' }];
	const sources: Array<{
		file: Id<'files'>;
		path: string;
		hash?: string;
		storageKey?: string;
		contentType?: string;
	}> = [];

	while (queue.length > 0) {
		const item = queue.shift();
		if (!item) break;

		const children = await ctx.db
			.query('files')
			.withIndex('by_owner_parent_name', (q) =>
				q
					.eq('owner', owner) //
					.eq('parent', item.directory),
			)
			.collect();

		for (const child of children) {
			const path = childPath(item.path, child.name);
			if (child.kind === 'directory') {
				const isActionOutputDirectory = path === '/.pro/actions';
				const isChildScope =
					child.name !== '.pro' && Boolean(await findControlDirectory(ctx, { owner, directory: child._id }));

				if (!isActionOutputDirectory && !isChildScope) {
					queue.push({ directory: child._id, path });
				}
				continue;
			}

			if (!isRuntimeSourcePath(path)) continue;
			if (sources.length >= limit) throw new Error('Too many runtime source files.');

			sources.push({
				file: child._id,
				path,
				hash: child.hash,
				storageKey: await findCurrentStorageKey(ctx, { file: child }),
				contentType: child.contentType,
			});
		}
	}

	return sources;
}

export const getFileWriteContext = defineQuery({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
		expectedRevision: zid('file_revisions').optional(),
	}),
	handler: async (ctx, { owner, file, expectedRevision }) => {
		//
		const row = await ensureFileOwner(ctx, { owner, file });
		if (row.kind !== 'file') throw NotFound();
		if (expectedRevision && row.currentRevision !== expectedRevision) throw new Error('File changed before write.');

		return {
			contentType: row.contentType,
			currentRevision: row.currentRevision,
			hash: row.hash,
			path: await buildPath(ctx, { file }),
			size: row.size,
			storageKey: await findCurrentStorageKey(ctx, { file: row }),
		};
	},
});

export async function createDirectoryForAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		action: Id<'actions'>;
		parent: Id<'files'>;
		name: string;
	},
) {
	//
	await ensureDirectoryOwner(ctx, {
		owner: args.owner,
		directory: args.parent,
	});

	await ensureChildNameAvailable(ctx, {
		owner: args.owner,
		parent: args.parent,
		name: args.name,
	});

	const file = await ctx.db.insert('files', {
		owner: args.owner,
		parent: args.parent,
		name: args.name,
		kind: 'directory',
		author: args.action,
	});

	const afterPath = await buildPath(ctx, { file });
	const revision = await ctx.db.insert('file_revisions', {
		owner: args.owner,
		file,
		action: args.action,
		changeKind: 'create',
		afterPath,
		patch: JSON.stringify({
			kind: 'create',
			after: {
				path: afterPath,
				kind: 'directory',
			},
		}),
	});

	await ctx.db.patch(file, { currentRevision: revision });

	return await findFile(ctx, { file });
}

export async function createTextFileForAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		action: Id<'actions'>;
		parent: Id<'files'>;
		name: string;
		content: string;
		contentType: string;
		hash: string;
		size: number;
		storageKey: string;
	},
) {
	//
	await ensureDirectoryOwner(ctx, {
		owner: args.owner,
		directory: args.parent,
	});

	await ensureChildNameAvailable(ctx, {
		owner: args.owner,
		parent: args.parent,
		name: args.name,
	});

	const file = await ctx.db.insert('files', {
		owner: args.owner,
		parent: args.parent,
		name: args.name,
		kind: 'file',
		contentType: args.contentType,
		size: args.size,
		hash: args.hash,
		author: args.action,
	});

	const afterPath = await buildPath(ctx, { file });
	const revision = await ctx.db.insert('file_revisions', {
		owner: args.owner,
		file,
		action: args.action,
		changeKind: 'create',
		afterPath,
		afterHash: args.hash,
		afterSize: args.size,
		storageKey: args.storageKey,
		contentType: args.contentType,
		patch: JSON.stringify({
			kind: 'create',
			after: {
				content: args.content,
				contentType: args.contentType,
				hash: args.hash,
				path: afterPath,
				size: args.size,
			},
		}),
	});

	await ctx.db.patch(file, { currentRevision: revision });

	return await findFile(ctx, { file });
}

export async function createStoredFileForAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		action: Id<'actions'>;
		parent: Id<'files'>;
		name: string;
		contentType: string;
		hash: string;
		size: number;
		storageKey: string;
	},
) {
	//
	await ensureDirectoryOwner(ctx, {
		owner: args.owner,
		directory: args.parent,
	});

	await ensureChildNameAvailable(ctx, {
		owner: args.owner,
		parent: args.parent,
		name: args.name,
	});

	const file = await ctx.db.insert('files', {
		owner: args.owner,
		parent: args.parent,
		name: args.name,
		kind: 'file',
		contentType: args.contentType,
		size: args.size,
		hash: args.hash,
		author: args.action,
	});

	const afterPath = await buildPath(ctx, { file });
	const revision = await ctx.db.insert('file_revisions', {
		owner: args.owner,
		file,
		action: args.action,
		changeKind: 'create',
		afterPath,
		afterHash: args.hash,
		afterSize: args.size,
		storageKey: args.storageKey,
		contentType: args.contentType,
		patch: JSON.stringify({
			kind: 'create',
			after: {
				contentType: args.contentType,
				hash: args.hash,
				path: afterPath,
				size: args.size,
				storageKey: args.storageKey,
			},
		}),
	});

	await ctx.db.patch(file, { currentRevision: revision });

	return await findFile(ctx, { file });
}

export async function createTextFileAtPathForAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		action: Id<'actions'>;
		parent: Id<'files'>;
		path: Array<string>;
		content: string;
		contentType: string;
		hash: string;
		size: number;
		storageKey: string;
	},
) {
	//
	const revisions: Array<Id<'file_revisions'>> = [];
	let parent = args.parent;
	const directoryNames = args.path.slice(0, -1);
	const name = args.path[args.path.length - 1];
	if (!name) throw new Error('Path must include a file name.');

	for (const directoryName of directoryNames) {
		const directory = await ensureDirectoryPathForAction(ctx, {
			owner: args.owner,
			action: args.action,
			parent,
			name: directoryName,
			revisions,
		});
		parent = directory._id;
	}

	const file = await createTextFileForAction(ctx, {
		owner: args.owner,
		action: args.action,
		parent,
		name,
		content: args.content,
		contentType: args.contentType,
		hash: args.hash,
		size: args.size,
		storageKey: args.storageKey,
	});
	if (file.currentRevision) revisions.push(file.currentRevision);

	return { file, revisions };
}

export async function writeTextFileForAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		action: Id<'actions'>;
		file: Id<'files'>;
		beforeContent: string;
		content: string;
		contentType: string;
		hash: string;
		size: number;
		storageKey: string;
		expectedRevision?: Id<'file_revisions'>;
	},
) {
	//
	const file = await ensureFileOwner(ctx, {
		owner: args.owner,
		file: args.file,
	});
	if (file.kind !== 'file') throw NotFound();
	if (args.expectedRevision && file.currentRevision !== args.expectedRevision)
		throw new Error('File changed before write.');

	const path = await buildPath(ctx, { file: args.file });
	const revision = await ctx.db.insert('file_revisions', {
		owner: args.owner,
		file: args.file,
		action: args.action,
		previousRevision: file.currentRevision,
		changeKind: 'update',
		beforePath: path,
		afterPath: path,
		beforeHash: file.hash,
		afterHash: args.hash,
		beforeSize: file.size,
		afterSize: args.size,
		storageKey: args.storageKey,
		contentType: args.contentType,
		patch: JSON.stringify({
			kind: 'update',
			before: {
				content: args.beforeContent,
				contentType: file.contentType,
				hash: file.hash,
				size: file.size,
			},
			after: {
				content: args.content,
				contentType: args.contentType,
				hash: args.hash,
				size: args.size,
			},
		}),
	});

	await ctx.db.patch(args.file, {
		currentRevision: revision,
		contentType: args.contentType,
		size: args.size,
		hash: args.hash,
	});

	return revision;
}

export async function moveFileForAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		action: Id<'actions'>;
		file: Id<'files'>;
		parent?: Id<'files'>;
		name?: string;
	},
) {
	//
	const file = await ensureFileOwner(ctx, {
		owner: args.owner,
		file: args.file,
	});

	const parent = args.parent ?? file.parent;
	const name = args.name ?? file.name;
	if (parent === 'root') throw NotFound();
	if (parent === file.parent && name === file.name) return undefined;

	await ensureDirectoryOwner(ctx, {
		owner: args.owner,
		directory: parent,
	});

	await ensureChildNameAvailable(ctx, {
		owner: args.owner,
		parent,
		name,
	});

	const beforePath = await buildPath(ctx, { file: args.file });

	await ctx.db.patch(args.file, {
		parent,
		name,
	});

	const afterPath = await buildPath(ctx, { file: args.file });
	const revision = await ctx.db.insert('file_revisions', {
		owner: args.owner,
		file: args.file,
		action: args.action,
		previousRevision: file.currentRevision,
		changeKind: 'rename',
		beforePath,
		afterPath,
		beforeHash: file.hash,
		afterHash: file.hash,
		beforeSize: file.size,
		afterSize: file.size,
		contentType: file.contentType,
		patch: JSON.stringify({
			kind: 'rename',
			before: { path: beforePath },
			after: { path: afterPath },
		}),
	});

	await ctx.db.patch(args.file, { currentRevision: revision });

	return revision;
}

export async function tagFileForAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		action: Id<'actions'>;
		file: Id<'files'>;
		key: string;
		value?: string;
	},
) {
	//
	const file = await ensureFileOwner(ctx, {
		owner: args.owner,
		file: args.file,
	});

	const existing = await ctx.db
		.query('file_tags')
		.withIndex('by_file_key', (q) =>
			q
				.eq('file', args.file) //
				.eq('key', args.key),
		)
		.unique();

	if (existing) {
		await ctx.db.patch(existing._id, { value: args.value });
	} else {
		await ctx.db.insert('file_tags', {
			owner: args.owner,
			file: args.file,
			key: args.key,
			value: args.value,
		});
	}

	const path = await buildPath(ctx, { file: args.file });
	const revision = await ctx.db.insert('file_revisions', {
		owner: args.owner,
		file: args.file,
		action: args.action,
		previousRevision: file.currentRevision,
		changeKind: 'tag',
		beforePath: path,
		afterPath: path,
		beforeHash: file.hash,
		afterHash: file.hash,
		beforeSize: file.size,
		afterSize: file.size,
		contentType: file.contentType,
		patch: JSON.stringify({
			kind: 'tag',
			key: args.key,
			before: existing?.value,
			after: args.value,
		}),
	});

	await ctx.db.patch(args.file, { currentRevision: revision });

	return revision;
}

export async function untagFileForAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		action: Id<'actions'>;
		file: Id<'files'>;
		key: string;
	},
) {
	//
	const file = await ensureFileOwner(ctx, {
		owner: args.owner,
		file: args.file,
	});

	const existing = await ctx.db
		.query('file_tags')
		.withIndex('by_file_key', (q) =>
			q
				.eq('file', args.file) //
				.eq('key', args.key),
		)
		.unique();

	if (!existing) return undefined;

	await ctx.db.delete(existing._id);

	const path = await buildPath(ctx, { file: args.file });
	const revision = await ctx.db.insert('file_revisions', {
		owner: args.owner,
		file: args.file,
		action: args.action,
		previousRevision: file.currentRevision,
		changeKind: 'tag',
		beforePath: path,
		afterPath: path,
		beforeHash: file.hash,
		afterHash: file.hash,
		beforeSize: file.size,
		afterSize: file.size,
		contentType: file.contentType,
		patch: JSON.stringify({
			kind: 'tag',
			key: args.key,
			before: existing.value,
			after: undefined,
		}),
	});

	await ctx.db.patch(args.file, { currentRevision: revision });

	return revision;
}

export async function writeActionOutputFile(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		action: Id<'actions'>;
		root: Id<'files'>;
		index: number;
		content: string;
		contentType: string;
		hash: string;
		size: number;
		storageKey: string;
	},
) {
	//
	const pro = await ensureDirectoryPathForAction(ctx, {
		owner: args.owner,
		action: args.action,
		parent: args.root,
		name: '.pro',
	});

	const actions = await ensureDirectoryPathForAction(ctx, {
		owner: args.owner,
		action: args.action,
		parent: pro._id,
		name: 'actions',
	});

	return await createTextFileForAction(ctx, {
		owner: args.owner,
		action: args.action,
		parent: actions._id,
		name: `${String(args.index).padStart(6, '0')}-result.mdx`,
		content: args.content,
		contentType: args.contentType,
		hash: args.hash,
		size: args.size,
		storageKey: args.storageKey,
	});
}

export async function buildPath(ctx: QueryCtx | MutationCtx, { file }: { file: Id<'files'> }) {
	//
	const names: Array<string> = [];
	let current: Doc<'files'> | null = await ctx.db.get(file);
	if (!current) throw NotFound();

	while (current) {
		if (current.name) names.unshift(current.name);
		if (current.parent === 'root') break;
		current = await ctx.db.get(current.parent);
	}

	return '/' + names.join('/');
}

async function ensureDirectoryPathForAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		action: Id<'actions'>;
		parent: Id<'files'>;
		name: string;
		revisions?: Array<Id<'file_revisions'>>;
	},
) {
	//
	const existing = await ctx.db
		.query('files')
		.withIndex('by_owner_parent_name', (q) =>
			q
				.eq('owner', args.owner) //
				.eq('parent', args.parent)
				.eq('name', args.name),
		)
		.unique();

	if (!existing) {
		const directory = await createDirectoryForAction(ctx, args);
		if (directory.currentRevision) args.revisions?.push(directory.currentRevision);

		return directory;
	}

	if (existing.kind !== 'directory') throw NotFound();

	return existing;
}

async function createUserRootDirectory(ctx: MutationCtx, { owner }: { owner: Id<'users'> }) {
	//
	const root = await ctx.db.insert('files', {
		owner,
		parent: 'root',
		name: '',
		kind: 'directory',
		author: owner,
	});

	// root bootstrap is the only direct file mutation path: act() needs a root before normal Reactor actions can exist.
	const action = await ctx.db.insert('actions', {
		owner,
		root,
		author: owner,
		spark: 'self',
		skill: 'bootstrap',
		input: { kind: 'root' },
		index: 1,
		status: 'succeeded',
		finishedAt: Date.now(),
	});

	const revision = await ctx.db.insert('file_revisions', {
		owner,
		file: root,
		action,
		changeKind: 'create',
		afterPath: '/',
		patch: JSON.stringify({
			kind: 'create',
			after: {
				path: '/',
				kind: 'directory',
			},
		}),
	});

	await ctx.db.patch(root, { currentRevision: revision });
	await ctx.db.patch(owner, { root });
	await enqueueAction(ctx, {
		owner,
		root,
		author: action,
		spark: action,
		skill: 'seed',
		input: {},
	});
	await ctx.scheduler.runAfter(0, internal.reactor._claimNext, {
		owner,
		root,
	});

	return root;
}

async function findCurrentStorageKey(ctx: QueryCtx | MutationCtx, { file }: { file: Doc<'files'> }) {
	//
	if (!file.currentRevision) return undefined;

	const revision = await ctx.db.get(file.currentRevision);
	if (!revision) throw NotFound();

	return revision.storageKey;
}

async function findControlDirectory(
	ctx: QueryCtx | MutationCtx,
	{ owner, directory }: { owner: Id<'users'>; directory: Id<'files'> },
) {
	//
	const control = await ctx.db
		.query('files')
		.withIndex('by_owner_parent_name', (q) =>
			q
				.eq('owner', owner) //
				.eq('parent', directory)
				.eq('name', '.pro'),
		)
		.unique();

	if (!control) return undefined;
	if (control.kind !== 'directory') return undefined;

	return control;
}

function childPath(parentPath: string, name: string) {
	//
	if (parentPath === '/') return `/${name}`;

	return `${parentPath}/${name}`;
}

function isRuntimeSourcePath(path: string) {
	//
	if (path === '/page.tsx') return true;
	if (path === '/page.css') return true;
	if (!path.includes('/.pro/') && path.endsWith('/page.tsx')) return true;
	if (!path.includes('/.pro/') && path.endsWith('/page.css')) return true;
	if (path === '/.pro/settings.json') return true;
	if (path.startsWith('/.pro/skills/') && path.endsWith('.ts')) return true;
	if (path.startsWith('/.pro/triggers/') && path.endsWith('.ts')) return true;
	if (path.startsWith('/.pro/components/') && path.endsWith('.tsx')) return true;

	return false;
}

async function ensureChildNameAvailable(
	ctx: QueryCtx | MutationCtx,
	{ owner, parent, name }: { owner: Id<'users'>; parent: Id<'files'>; name: string },
) {
	//
	const existing = await ctx.db
		.query('files')
		.withIndex('by_owner_parent_name', (q) =>
			q
				.eq('owner', owner) //
				.eq('parent', parent)
				.eq('name', name),
		)
		.unique();

	if (existing) throw new Error('A file already exists at this path.');
}
