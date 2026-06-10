import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internalMutation, mutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { fileBudgetSchema } from 'schemas/fileSchema';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import { createActionsForFile } from './actions';
import {
	adjustFileBudget,
	catVisibleFile,
	copyFile,
	createFile,
	ensureFileOwner,
	ensureFileVisible,
	findFilesByTag,
	findInboxFiles,
	findTags,
	headFile,
	listChildren,
	moveFile,
	readFile,
	renderCurrentContent,
	removeTag,
	setFileTags,
	tailFile,
	treeFile,
	upsertTag,
	writeFileContent,
} from './files.private';
import { findLoopByKey } from './loops.private';
import { markFileRead } from './reads.private';
import { latestActionForFile } from './reactor.private';
import { getCurrentUser } from './users.private';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

const zeroBudget = {
	total: 0n,
	available: 0n,
	reserved: 0n,
	spent: 0n,
};

const tagsArg = z.array(
	z.object({
		key: z.string().min(1),
		value: z.string(),
	}),
);

export const create = mutation({
	args: {
		parent: zid('files').optional(),
		name: z.string().min(1),
		content: z.string().optional(),
		tags: tagsArg.default([]),
		budget: fileBudgetSchema.optional(),
		shouldAddInboxTag: z.boolean().default(true),
	},
	handler: async (ctx, args) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await createFile(ctx, {
			owner: currentUser._id,
			parent: args.parent,
			name: args.name,
			author: currentUser._id,
			content: args.content,
			tags: args.tags,
			budget: args.budget,
			shouldAddInboxTag: args.shouldAddInboxTag,
		});
	},
});

export const findOne = query({
	args: {
		fileId: zid('files'),
	},
	handler: async (ctx, { fileId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const file = await ensureFileVisible(ctx, { fileId, viewer: currentUser._id });

		return await fileCardFromFile(ctx, {
			owner: currentUser._id,
			file,
		});
	},
});

export const findAll = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const tags = await ctx.db
			.query('file_tags')
			.withIndex('by_owner_key_value', (q) =>
				q.eq('owner', currentUser._id).eq('key', 'kind').eq('value', 'task'),
			)
			.collect();

		return await fileCardsFromTags(ctx, { owner: currentUser._id, tags });
	},
});

export const findAllPaginated = query({
	args: {
		paginationOpts: paginationOptionsSchema,
	},
	handler: async (ctx, { paginationOpts }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const page = await ctx.db
			.query('file_tags')
			.withIndex('by_owner_key_value', (q) =>
				q.eq('owner', currentUser._id).eq('key', 'kind').eq('value', 'task'),
			)
			.order('desc')
			.paginate(paginationOpts);

		return {
			...page,
			page: await fileCardsFromTags(ctx, {
				owner: currentUser._id,
				tags: page.page,
			}),
		};
	},
});

export const findAllAtInboxPaginated = query({
	args: {
		parentId: zid('files').optional(),
		paginationOpts: paginationOptionsSchema,
	},
	handler: async (ctx, { parentId, paginationOpts }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		if (parentId) {
			await ensureFileOwner(ctx, {
				fileId: parentId,
				owner: currentUser._id,
			});
			const page = await ctx.db
				.query('files')
				.withIndex('by_parent', (q) => q.eq('parent', parentId))
				.order('desc')
				.paginate(paginationOpts);

			return {
				...page,
				page: await fileCardsFromFiles(ctx, {
					owner: currentUser._id,
					files: page.page,
				}),
			};
		}

		const page = await ctx.db
			.query('file_tags')
			.withIndex('by_owner_key_value', (q) =>
				q.eq('owner', currentUser._id).eq('key', 'inbox').eq('value', 'true'),
			)
			.order('desc')
			.paginate(paginationOpts);

		return {
			...page,
			page: await fileCardsFromTags(ctx, {
				owner: currentUser._id,
				tags: page.page,
			}),
		};
	},
});

export const add = mutation({
	args: {
		message: z.string().min(1),
		initialFunds: z.bigint(),
		intelligence: z.string().optional(),
		loopKey: z.string().min(1).nullable().optional(),
	},
	handler: async (ctx, { message, initialFunds, intelligence, loopKey }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const name = fileNameFromMessage(message);
		const fileId = await createFile(ctx, {
			owner: currentUser._id,
			name,
			author: currentUser._id,
			content: message,
			tags: [
				{ key: 'kind', value: 'task' },
				{ key: 'status', value: 'active' },
			],
			shouldAddInboxTag: false,
		});

		if (initialFunds > 0n) {
			await adjustFileBudget(ctx, {
				owner: currentUser._id,
				file: fileId,
				author: currentUser._id,
				amount: initialFunds,
			});
		}

		const selectedLoop = await loopForNewFile(ctx, {
			owner: currentUser._id,
			loopKey,
		});
		const actionArgs: Record<string, unknown> = {
			text: message,
			message,
		};
		await createActionsForFile(ctx, {
			owner: currentUser._id,
			file: fileId,
			loopKey: selectedLoop?.key,
			intelligenceKey: intelligence,
			skills: [
				{
					skillKey: 'say',
					args: actionArgs,
				},
			],
		});

		return fileId;
	},
});

export const read = query({
	args: {
		fileId: zid('files'),
	},
	handler: async (ctx, { fileId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await readFile(ctx, { fileId, owner: currentUser._id, recentActionLimit: 16 });
	},
});

export const cat = query({
	args: {
		fileId: zid('files'),
	},
	handler: async (ctx, { fileId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await catVisibleFile(ctx, { fileId, viewer: currentUser._id });
	},
});

export const ls = query({
	args: {
		parent: zid('files'),
	},
	handler: async (ctx, { parent }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await listChildren(ctx, { parent, owner: currentUser._id });
	},
});

export const head = query({
	args: {
		fileId: zid('files'),
		lines: z.number().int().positive().max(500).default(40),
	},
	handler: async (ctx, { fileId, lines }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await headFile(ctx, { fileId, owner: currentUser._id, lines });
	},
});

export const tail = query({
	args: {
		fileId: zid('files'),
		lines: z.number().int().positive().max(500).default(40),
	},
	handler: async (ctx, { fileId, lines }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await tailFile(ctx, { fileId, owner: currentUser._id, lines });
	},
});

export const tree = query({
	args: {
		root: zid('files'),
		maxDepth: z.number().int().nonnegative().max(12).default(4),
	},
	handler: async (ctx, { root, maxDepth }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await treeFile(ctx, { root, owner: currentUser._id, maxDepth });
	},
});

export const updateContent = mutation({
	args: {
		fileId: zid('files'),
		content: z.string(),
	},
	handler: async (ctx, { fileId, content }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await writeFileContent(ctx, {
			fileId,
			owner: currentUser._id,
			author: currentUser._id,
			content,
		});
	},
});

export const move = mutation({
	args: {
		fileId: zid('files'),
		newParent: zid('files').nullable().optional(),
	},
	handler: async (ctx, { fileId, newParent }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await moveFile(ctx, {
			fileId,
			owner: currentUser._id,
			author: currentUser._id,
			newParent,
		});
	},
});

export const rename = mutation({
	args: {
		fileId: zid('files'),
		name: z.string().min(1),
	},
	handler: async (ctx, { fileId, name }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await moveFile(ctx, {
			fileId,
			owner: currentUser._id,
			author: currentUser._id,
			newName: name,
		});
	},
});

export const tag = mutation({
	args: {
		file: zid('files'),
		key: z.string().min(1),
		value: z.string(),
	},
	handler: async (ctx, args) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await upsertTag(ctx, {
			owner: currentUser._id,
			file: args.file,
			key: args.key,
			value: args.value,
			author: currentUser._id,
		});
	},
});

export const untag = mutation({
	args: {
		file: zid('files'),
		key: z.string().min(1),
	},
	handler: async (ctx, args) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await removeTag(ctx, {
			owner: currentUser._id,
			file: args.file,
			key: args.key,
			author: currentUser._id,
		});
	},
});

export const setTags = mutation({
	args: {
		file: zid('files'),
		tags: tagsArg,
		shouldRemoveInboxTag: z.boolean().default(false),
	},
	handler: async (ctx, { file, tags, shouldRemoveInboxTag }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await setFileTags(ctx, {
			owner: currentUser._id,
			file,
			author: currentUser._id,
			tags,
			shouldRemoveInboxTag,
		});
	},
});

export const inbox = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await findInboxFiles(ctx, { owner: currentUser._id });
	},
});

export const queryByTag = query({
	args: {
		key: z.string().min(1),
		value: z.string().optional(),
	},
	handler: async (ctx, { key, value }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await findFilesByTag(ctx, { owner: currentUser._id, key, value });
	},
});

export const copy = mutation({
	args: {
		source: zid('files'),
		parent: zid('files').optional(),
		name: z.string().min(1),
	},
	handler: async (ctx, { source, parent, name }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await copyFile(ctx, {
			owner: currentUser._id,
			source,
			parent,
			name,
			author: currentUser._id,
		});
	},
});

export const updateBudget = mutation({
	args: {
		file: zid('files'),
		amount: z.bigint(),
	},
	handler: async (ctx, { file, amount }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await adjustFileBudget(ctx, {
			owner: currentUser._id,
			file,
			author: currentUser._id,
			amount,
		});
	},
});

export const markAsRead = mutation({
	args: {
		fileId: zid('files'),
	},
	handler: async (ctx, { fileId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, {
			fileId,
			owner: currentUser._id,
		});
		const latest = await latestActionForFile(ctx, { file: fileId });

		return await markFileRead(ctx, {
			user: currentUser._id,
			file: fileId,
			lastReadActionIndex: latest?.index ?? 0,
		});
	},
});

export const _setStatus = internalMutation({
	args: {
		fileId: zid('files'),
		newStatus: z.enum(['active', 'done', 'discarded']),
	},
	handler: async (ctx, { fileId, newStatus }) => {
		//
		const file = await ctx.db.get(fileId);
		if (!file) throw NotFound();
		await setFileTags(ctx, {
			owner: file.owner,
			file: fileId,
			author: file.owner,
			tags: [{ key: 'status', value: newStatus }],
			shouldCreateAction: false,
		});
	},
});

export const _updateContent = internalMutation({
	args: {
		owner: zid('users'),
		fileId: zid('files'),
		name: z.string().optional(),
		content: z.string().optional(),
		summary: z.string().optional(),
	},
	handler: async (ctx, { owner, fileId, name, content }) => {
		//
		await ensureFileOwner(ctx, {
			fileId,
			owner,
		});
		if (name) {
			await moveFile(ctx, {
				owner,
				fileId,
				author: owner,
				newName: name,
			});
		}
		if (content !== undefined) {
			await writeFileContent(ctx, {
				owner,
				fileId,
				author: owner,
				content,
			});
		}
	},
});

async function loopForNewFile(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		loopKey?: string | null;
	},
) {
	//
	if (args.loopKey === null) return undefined;

	if (args.loopKey) {
		return await findLoopByKey(ctx, {
			owner: args.owner,
			key: args.loopKey,
		});
	}

	return await findLoopByKey(ctx, { owner: args.owner, key: '@pro/Seek' });
}

async function fileCardsFromTags(
	ctx: QueryCtx | MutationCtx,
	args: {
		owner: Id<'users'>;
		tags: Doc<'file_tags'>[];
	},
) {
	//
	const files = [];

	for (const tag of args.tags) {
		const file = await ctx.db.get(tag.file);
		if (file && file.owner === args.owner) files.push(file);
	}

	return await fileCardsFromFiles(ctx, {
		owner: args.owner,
		files,
	});
}

async function fileCardsFromFiles(
	ctx: QueryCtx | MutationCtx,
	args: {
		owner: Id<'users'>;
		files: Doc<'files'>[];
	},
) {
	//
	const files = [];

	for (const file of args.files) {
		if (file.owner !== args.owner) continue;
		files.push(
			await fileCardFromFile(ctx, {
				owner: args.owner,
				file,
			}),
		);
	}

	return files;
}

async function fileCardFromFile(
	ctx: QueryCtx | MutationCtx,
	args: {
		owner: Id<'users'>;
		file: Doc<'files'>;
	},
) {
	//
	const tags = await findTags(ctx, {
		file: args.file._id,
		owner: args.owner,
	});
	const content = await renderCurrentContent(ctx, { file: args.file });
	const statusTag = tagValue(tags, 'status');
	const latest = await latestActionForFile(ctx, { file: args.file._id });
	const read = await ctx.db
		.query('reads')
		.withIndex('by_user_file', (q) => q.eq('user', args.owner).eq('file', args.file._id))
		.unique();
	const running = await ctx.db
		.query('actions')
		.withIndex('by_file_status', (q) => q.eq('file', args.file._id).eq('status', 'running'))
		.first();
	const blocked = await ctx.db
		.query('actions')
		.withIndex('by_file_status', (q) => q.eq('file', args.file._id).eq('status', 'pending authorization'))
		.first();
	const status = fileStatus({
		statusTag,
		latestActionIndex: latest?.index ?? -1,
		lastReadActionIndex: read?.lastReadActionIndex ?? -1,
		isActing: Boolean(running),
		isBlocked: Boolean(blocked),
	});

	return {
		_id: args.file._id,
		_creationTime: args.file._creationTime,
		owner: args.file.owner,
		parent: args.file.parent,
		name: args.file.name,
		content,
		summary: undefined,
		status,
		isActive: status !== 'done' && status !== 'discarded',
		energyBudget: fileBudgetSchema.parse(args.file.budget ?? zeroBudget),
		budget: args.file.budget,
		file: args.file,
		tags,
		updatedAt: args.file.updatedAt,
		createdAt: args.file.createdAt,
	};
}

function fileStatus(args: {
	statusTag: string | undefined;
	latestActionIndex: number;
	lastReadActionIndex: number;
	isActing: boolean;
	isBlocked: boolean;
}) {
	//
	const statusSchema = z.enum(['idle', 'unread', 'acting', 'blocked', 'done', 'discarded']);

	if (args.statusTag === 'done') return statusSchema.parse('done');
	if (args.statusTag === 'discarded') return statusSchema.parse('discarded');
	if (args.isBlocked) return statusSchema.parse('blocked');
	if (args.isActing) return statusSchema.parse('acting');
	if (args.latestActionIndex > args.lastReadActionIndex) return statusSchema.parse('unread');

	return statusSchema.parse('idle');
}

function tagValue(tags: Doc<'file_tags'>[], key: string) {
	//
	const tag = tags.find((candidate) => candidate.key === key);
	return tag?.value;
}

function fileNameFromMessage(message: string) {
	//
	const firstLine = message.trim().split('\n')[0] ?? 'Untitled file';
	const clean = firstLine.replace(/\s+/g, ' ').trim();
	if (!clean) return 'Untitled file';
	if (clean.length <= 60) return clean;

	return `${clean.slice(0, 57).trim()}...`;
}
