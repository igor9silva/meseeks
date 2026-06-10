import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { mutation, query, internalMutation } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import { fileBudgetSchema } from 'schemas/fileSchema';
import { createActionsForFile } from './actions';
import {
	adjustFileBudget,
	createFile,
	ensureFileOwner,
	findTags,
	moveFile,
	renderCurrentContent,
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

const statusTagSchema = z.enum(['active', 'done', 'discarded']);
const fileViewStatusSchema = z.enum(['idle', 'unread', 'acting', 'blocked', 'done', 'discarded']);

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

		return await fileViewsFromTags(ctx, { owner: currentUser._id, tags });
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
			page: await fileViewsFromTags(ctx, {
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
				page: await fileViewsFromFiles(ctx, {
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
			page: await fileViewsFromTags(ctx, {
				owner: currentUser._id,
				tags: page.page,
			}),
		};
	},
});

export const findOne = query({
	args: {
		fileId: zid('files'),
	},
	handler: async (ctx, { fileId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const file = await ensureFileOwner(ctx, {
			fileId: fileId,
			owner: currentUser._id,
		});

		return await fileViewFromFile(ctx, {
			owner: currentUser._id,
			file,
		});
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

export const markAsRead = mutation({
	args: {
		fileId: zid('files'),
	},
	handler: async (ctx, { fileId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, {
			fileId: fileId,
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
		newStatus: statusTagSchema,
	},
	handler: async (ctx, { fileId, newStatus }) => {
		//
		const file = await ctx.db.get(fileId);
		if (!file) throw NotFound();
		await setStatusTag(ctx, {
			owner: file.owner,
			file: fileId,
			status: newStatus,
			author: file.owner,
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
			fileId: fileId,
			owner,
		});
		if (name) {
			await moveFile(ctx, {
				owner,
				fileId: fileId,
				author: owner,
				newName: name,
			});
		}
		if (content !== undefined) {
			await writeFileContent(ctx, {
				owner,
				fileId: fileId,
				author: owner,
				content,
			});
		}
	},
});

async function fileViewsFromTags(
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

	return await fileViewsFromFiles(ctx, {
		owner: args.owner,
		files,
	});
}

async function fileViewsFromFiles(
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
			await fileViewFromFile(ctx, {
				owner: args.owner,
				file,
			}),
		);
	}

	return files;
}

async function fileViewFromFile(
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
	const status = oldStatus({
		statusTag,
		latestActionIndex: latest?.index ?? -1,
		lastReadActionIndex: read?.lastReadActionIndex ?? -1,
		isActing: Boolean(running),
		isBlocked: Boolean(blocked) || latest?.result?.metadata?.['seekState'] === 'blocked',
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

async function setStatusTag(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		file: Id<'files'>;
		status: z.infer<typeof statusTagSchema>;
		author: Id<'users'>;
	},
) {
	//
	const existing = await ctx.db
		.query('file_tags')
		.withIndex('by_file_key', (q) => q.eq('file', args.file).eq('key', 'status'))
		.unique();

	if (existing) {
		await ctx.db.patch(existing._id, {
			value: args.status,
			author: args.author,
			createdAt: Date.now(),
		});
		return;
	}

	await ctx.db.insert('file_tags', {
		owner: args.owner,
		file: args.file,
		key: 'status',
		value: args.status,
		author: args.author,
		createdAt: Date.now(),
	});
}

function oldStatus(args: {
	statusTag: string | undefined;
	latestActionIndex: number;
	lastReadActionIndex: number;
	isActing: boolean;
	isBlocked: boolean;
}) {
	//
	if (args.statusTag === 'done') return fileViewStatusSchema.parse('done');
	if (args.statusTag === 'discarded') return fileViewStatusSchema.parse('discarded');
	if (args.isBlocked) return fileViewStatusSchema.parse('blocked');
	if (args.isActing) return fileViewStatusSchema.parse('acting');
	if (args.latestActionIndex > args.lastReadActionIndex) return fileViewStatusSchema.parse('unread');

	return fileViewStatusSchema.parse('idle');
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
