import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { mutation, query } from 'lib/convex';
import { fileBudgetSchema } from 'schemas/fileSchema';
import { fileLinkKindSchema } from 'schemas/fileLinkSchema';
import {
	adjustFileBudget,
	catVisibleFile,
	copyFile,
	createFile,
	ensureFileVisible,
	findFilesByTag,
	findInboxFiles,
	headFile,
	listChildren,
	moveFile,
	readFile,
	removeTag,
	setFileTags,
	tailFile,
	treeFile,
	upsertTag,
	writeFileContent,
} from './files.private';
import { getCurrentUser } from './users.private';

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
		return await ensureFileVisible(ctx, { fileId, viewer: currentUser._id });
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

export const write = mutation({
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
		kind: fileLinkKindSchema.default('copy'),
	},
	handler: async (ctx, { source, parent, name, kind }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await copyFile(ctx, {
			owner: currentUser._id,
			source,
			parent,
			name,
			kind,
			author: currentUser._id,
		});
	},
});

export const changeEnergy = mutation({
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
