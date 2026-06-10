import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { createFilePatch, updateContentPatch } from 'lib/reactor/patches';
import { defineMutation, defineQuery } from 'lib/convex';
import { InsufficientAccountFunds, NotFound } from 'lib/errors';
import { authorSchema } from 'schemas/authorSchema';
import { env } from 'schemas/envSchema';
import { fileBudgetSchema, objectContentPointerSchema } from 'schemas/fileSchema';
import { fileLinkKindSchema } from 'schemas/fileLinkSchema';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { markIndexesStale } from './indexes.private';
import { findReadCursor } from './reads.private';
import { recordMutationAction, latestActionForFile, recentActionsForFile } from './reactor.private';

const fileTagInputSchema = z.object({
	key: z.string().min(1),
	value: z.string(),
});

const createFileArgs = z.object({
	owner: zid('users'),
	parent: zid('files').optional(),
	name: z.string().min(1),
	author: authorSchema,
	content: z.string().optional(),
	provider: z.string().min(1).optional(),
	providerReference: z.string().min(1).optional(),
	tags: z.array(fileTagInputSchema).default([]),
	budget: fileBudgetSchema.optional(),
	isPublic: z.boolean().optional(),
	sourceOwner: zid('users').optional(),
	sourceKey: z.string().min(1).optional(),
	sourceFile: zid('files').optional(),
	shouldAddInboxTag: z.boolean().default(true),
	shouldCreateAction: z.boolean().default(true),
});

export const ensureFileOwner = defineQuery({
	args: z.object({
		fileId: zid('files'),
		owner: zid('users'),
	}),
	handler: async (ctx, { fileId, owner }) => {
		//
		const file = await ctx.db.get(fileId);
		if (!file || file.owner !== owner) throw NotFound();

		return file;
	},
});

export const ensureFileVisible = defineQuery({
	args: z.object({
		fileId: zid('files'),
		viewer: zid('users'),
	}),
	handler: async (ctx, { fileId, viewer }) => {
		//
		const file = await ctx.db.get(fileId);
		if (!file) throw NotFound();
		if (file.owner === viewer || file.isPublic === true || (await hasPublicAncestor(ctx, { file }))) return file;

		throw NotFound();
	},
});

export const findChildByName = defineQuery({
	args: z.object({
		owner: zid('users'),
		parent: zid('files').optional(),
		name: z.string().min(1),
	}),
	handler: async (ctx, { owner, parent, name }) => {
		//
		return await ctx.db
			.query('files')
			.withIndex('by_owner_parent_name', (q) =>
				q
					.eq('owner', owner) //
					.eq('parent', parent)
					.eq('name', name),
			)
			.unique();
	},
});

export const createFile = defineMutation({
	args: createFileArgs,
	handler: async (ctx, args) => {
		//
		const now = Date.now();
		if (args.parent) await ensureFileOwner(ctx, { fileId: args.parent, owner: args.owner });

		const existing = await findChildByName(ctx, {
			owner: args.owner,
			parent: args.parent,
			name: args.name,
		});
		if (existing) throw new Error('A file with this name already exists here.');

		const fileId = await ctx.db.insert('files', {
			owner: args.owner,
			parent: args.parent,
			name: args.name,
			author: args.author,
			provider: args.provider,
			providerReference: args.providerReference,
			budget: args.budget,
			isPublic: args.isPublic,
			sourceOwner: args.sourceOwner,
			sourceKey: args.sourceKey,
			sourceFile: args.sourceFile,
			createdAt: now,
			updatedAt: now,
		});

		if (args.content !== undefined) {
			await writeTextPointer(ctx, {
				owner: args.owner,
				fileId,
				author: args.author,
				text: args.content,
				now,
			});
		}

		const tags = mergeInitialTags({
			tags: args.tags,
			shouldAddInboxTag: args.shouldAddInboxTag,
		});

		for (const tag of tags) {
			await upsertTag(ctx, {
				owner: args.owner,
				file: fileId,
				key: tag.key,
				value: tag.value,
				author: args.author,
				shouldCreateAction: false,
			});
		}

		if (args.shouldCreateAction) {
			await recordMutationAction(ctx, {
				owner: args.owner,
				file: fileId,
				author: args.author,
				skillKey: createFileActionSkill(),
				args: {
					name: args.name,
					parent: args.parent,
				},
				patch: createFilePatch(args.name, tags),
			});
		}

		return fileId;
	},
});

export const listChildren = defineQuery({
	args: z.object({
		parent: zid('files'),
		owner: zid('users'),
	}),
	handler: async (ctx, { parent, owner }) => {
		//
		await ensureFileOwner(ctx, { fileId: parent, owner });

		return await ctx.db
			.query('files')
			.withIndex('by_parent', (q) => q.eq('parent', parent))
			.collect();
	},
});

type FileTreeNode = {
	file: Doc<'files'>;
	children: FileTreeNode[];
};

export const treeFile = defineQuery({
	args: z.object({
		root: zid('files'),
		owner: zid('users'),
		maxDepth: z.number().int().nonnegative().max(12).default(4),
	}),
	handler: async (ctx, { root, owner, maxDepth }): Promise<FileTreeNode> => {
		//
		const file = await ensureFileOwner(ctx, { fileId: root, owner });
		return await buildTree(ctx, {
			owner,
			file,
			depth: 0,
			maxDepth,
		});
	},
});

export const findTags = defineQuery({
	args: z.object({
		file: zid('files'),
		owner: zid('users'),
	}),
	handler: async (ctx, { file, owner }) => {
		//
		await ensureFileOwner(ctx, { fileId: file, owner });

		return await ctx.db
			.query('file_tags')
			.withIndex('by_file', (q) => q.eq('file', file))
			.collect();
	},
});

export const findFilesByTag = defineQuery({
	args: z.object({
		owner: zid('users'),
		key: z.string().min(1),
		value: z.string().optional(),
	}),
	handler: async (ctx, { owner, key, value }) => {
		//
		if (value !== undefined) {
			const tags = await ctx.db
				.query('file_tags')
				.withIndex('by_owner_key_value', (q) =>
					q
						.eq('owner', owner) //
						.eq('key', key)
						.eq('value', value),
				)
				.collect();

			return await loadTaggedFiles(ctx, { tags });
		}

		const tags = await ctx.db
			.query('file_tags')
			.withIndex('by_owner_key', (q) =>
				q
					.eq('owner', owner) //
					.eq('key', key),
			)
			.collect();

		return await loadTaggedFiles(ctx, { tags });
	},
});

export const findInboxFiles = defineQuery({
	args: z.object({
		owner: zid('users'),
	}),
	handler: async (ctx, { owner }) => {
		//
		const tags = await ctx.db
			.query('file_tags')
			.withIndex('by_owner_key_value', (q) =>
				q
					.eq('owner', owner) //
					.eq('key', 'inbox')
					.eq('value', 'true'),
			)
			.collect();

		return await loadTaggedFiles(ctx, { tags });
	},
});

export const readFile = defineQuery({
	args: z.object({
		fileId: zid('files'),
		owner: zid('users'),
		recentActionLimit: z.number().int().positive().max(50).default(12),
	}),
	handler: async (ctx, { fileId, owner, recentActionLimit }) => {
		//
		const file = await ensureFileOwner(ctx, { fileId, owner });
		const tags = await findTags(ctx, { file: fileId, owner });
		const children = await listChildren(ctx, { parent: fileId, owner });
		const content = await renderCurrentContent(ctx, { file });
		const latestAction = await latestActionForFile(ctx, { file: fileId });
		const recentActions = await recentActionsForFile(ctx, { file: fileId, limit: recentActionLimit });
		const readCursor = await findReadCursor(ctx, {
			user: owner,
			file: fileId,
		});

		return {
			file,
			tags,
			content,
			children,
			latestAction,
			recentActions,
			readCursor,
			derived: deriveState({ latestAction, recentActions, readCursor }),
		};
	},
});

export const catFile = defineQuery({
	args: z.object({
		fileId: zid('files'),
		owner: zid('users'),
	}),
	handler: async (ctx, { fileId, owner }) => {
		//
		const file = await ensureFileOwner(ctx, { fileId, owner });
		return await renderCurrentContent(ctx, { file });
	},
});

export const catVisibleFile = defineQuery({
	args: z.object({
		fileId: zid('files'),
		viewer: zid('users'),
	}),
	handler: async (ctx, { fileId, viewer }) => {
		//
		const file = await ensureFileVisible(ctx, { fileId, viewer });
		return await renderCurrentContent(ctx, { file });
	},
});

export const headFile = defineQuery({
	args: z.object({
		fileId: zid('files'),
		owner: zid('users'),
		lines: z.number().int().positive().max(500).default(40),
	}),
	handler: async (ctx, { fileId, owner, lines }) => {
		//
		const file = await ensureFileOwner(ctx, { fileId, owner });
		if (file.currentContent?.kind === 'object') return await renderCurrentContent(ctx, { file });

		const text = await readCurrentText(ctx, { file });
		return text.split('\n').slice(0, lines).join('\n');
	},
});

export const tailFile = defineQuery({
	args: z.object({
		fileId: zid('files'),
		owner: zid('users'),
		lines: z.number().int().positive().max(500).default(40),
	}),
	handler: async (ctx, { fileId, owner, lines }) => {
		//
		const file = await ensureFileOwner(ctx, { fileId, owner });
		if (file.currentContent?.kind === 'object') return await renderCurrentContent(ctx, { file });

		const text = await readCurrentText(ctx, { file });
		return text.split('\n').slice(-lines).join('\n');
	},
});

export const writeFileContent = defineMutation({
	args: z.object({
		fileId: zid('files'),
		owner: zid('users'),
		author: authorSchema,
		content: z.string(),
		shouldCreateAction: z.boolean().default(true),
	}),
	handler: async (ctx, { fileId, owner, author, content, shouldCreateAction }) => {
		//
		const file = await ensureFileOwner(ctx, { fileId, owner });
		const previous = await readCurrentText(ctx, { file });
		const now = Date.now();
		const patch = updateContentPatch(file.name, previous, content);

		await writeTextPointer(ctx, {
			owner,
			fileId,
			author,
			text: content,
			now,
		});

		if (shouldCreateAction) {
			await recordMutationAction(ctx, {
				owner,
				file: fileId,
				author,
				skillKey: 'write',
				args: {},
				patch,
			});
		}

		await markIndexesStale(ctx, {
			owner,
			file: fileId,
		});

		return patch;
	},
});

export const moveFile = defineMutation({
	args: z.object({
		fileId: zid('files'),
		owner: zid('users'),
		author: authorSchema,
		newParent: zid('files').nullable().optional(),
		newName: z.string().min(1).optional(),
		shouldCreateAction: z.boolean().default(true),
	}),
	handler: async (ctx, { fileId, owner, author, newParent, newName, shouldCreateAction }) => {
		//
		const file = await ensureFileOwner(ctx, { fileId, owner });
		const nextParent = newParent === undefined ? file.parent : (newParent ?? undefined);
		if (nextParent) await ensureFileOwner(ctx, { fileId: nextParent, owner });

		const nextName = newName ?? file.name;
		const existing = await findChildByName(ctx, {
			owner,
			parent: nextParent,
			name: nextName,
		});
		if (existing && existing._id !== fileId) throw new Error('A file with this name already exists here.');

		const oldPath = await buildPath(ctx, { file });
		const newPath = await buildPathForParts(ctx, {
			owner,
			parent: nextParent,
			name: nextName,
		});
		const now = Date.now();

		await ctx.db.patch(fileId, {
			parent: nextParent,
			name: nextName,
			updatedAt: now,
		});

		const patch = `rename ${oldPath} -> ${newPath}`;
		if (shouldCreateAction) {
			await recordMutationAction(ctx, {
				owner,
				file: fileId,
				author,
				skillKey: newName && nextParent !== file.parent ? 'moveRename' : newName ? 'rename' : 'move',
				args: {
					parent: nextParent,
					name: nextName,
				},
				patch,
			});
		}

		return patch;
	},
});

export const upsertTag = defineMutation({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
		key: z.string().min(1),
		value: z.string(),
		author: authorSchema,
		shouldCreateAction: z.boolean().default(true),
	}),
	handler: async (ctx, { owner, file, key, value, author, shouldCreateAction }) => {
		//
		await ensureFileOwner(ctx, { fileId: file, owner });

		const existing = await ctx.db
			.query('file_tags')
			.withIndex('by_file_key', (q) => q.eq('file', file).eq('key', key))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, { value, author, createdAt: Date.now() });

			if (shouldCreateAction && existing.value !== value) {
				await recordMutationAction(ctx, {
					owner,
					file,
					author,
					skillKey: 'tag',
					args: { key, value },
					patch: `~ tag ${key}=${existing.value} -> ${key}=${value}`,
				});
			}

			return existing._id;
		}

		const tagId = await ctx.db.insert('file_tags', {
			owner,
			file,
			key,
			value,
			author,
			createdAt: Date.now(),
		});

		if (shouldCreateAction) {
			await recordMutationAction(ctx, {
				owner,
				file,
				author,
				skillKey: 'tag',
				args: { key, value },
				patch: `+ tag ${key}=${value}`,
			});
		}

		return tagId;
	},
});

export const removeTag = defineMutation({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
		key: z.string().min(1),
		author: authorSchema,
		shouldCreateAction: z.boolean().default(true),
	}),
	handler: async (ctx, { owner, file, key, author, shouldCreateAction }) => {
		//
		await ensureFileOwner(ctx, { fileId: file, owner });

		const existing = await ctx.db
			.query('file_tags')
			.withIndex('by_file_key', (q) => q.eq('file', file).eq('key', key))
			.unique();

		if (!existing) return false;

		await ctx.db.delete(existing._id);

		if (shouldCreateAction) {
			await recordMutationAction(ctx, {
				owner,
				file,
				author,
				skillKey: 'untag',
				args: { key },
				patch: `- tag ${existing.key}=${existing.value}`,
			});
		}

		return true;
	},
});

export const setFileTags = defineMutation({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
		author: authorSchema,
		tags: z.array(fileTagInputSchema),
		shouldRemoveInboxTag: z.boolean().default(false),
		shouldCreateAction: z.boolean().default(true),
		actionSkill: z.string().min(1).default('setTags'),
	}),
	handler: async (ctx, { owner, file, author, tags, shouldRemoveInboxTag, shouldCreateAction, actionSkill }) => {
		//
		const patches = [];

		if (shouldRemoveInboxTag) {
			const removed = await removeTag(ctx, {
				owner,
				file,
				key: 'inbox',
				author,
				shouldCreateAction: false,
			});
			if (removed) patches.push('- tag inbox=true');
		}

		for (const tag of tags) {
			const existing = await ctx.db
				.query('file_tags')
				.withIndex('by_file_key', (q) => q.eq('file', file).eq('key', tag.key))
				.unique();
			await upsertTag(ctx, {
				owner,
				file,
				key: tag.key,
				value: tag.value,
				author,
				shouldCreateAction: false,
			});
			if (!existing) {
				patches.push(`+ tag ${tag.key}=${tag.value}`);
			} else if (existing.value !== tag.value) {
				patches.push(`~ tag ${tag.key}=${existing.value} -> ${tag.key}=${tag.value}`);
			}
		}

		const patch = patches.join('\n');
		if (shouldCreateAction && patch) {
			await recordMutationAction(ctx, {
				owner,
				file,
				author,
				skillKey: actionSkill,
				args: { tags },
				patch,
			});
		}

		return patch;
	},
});

export const clearFileTag = defineMutation({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
		author: authorSchema,
		key: z.string().min(1),
		actionSkill: z.string().min(1).default('removeTag'),
		shouldCreateAction: z.boolean().default(true),
	}),
	handler: async (ctx, { owner, file, author, key, actionSkill, shouldCreateAction }) => {
		//
		const existing = await ctx.db
			.query('file_tags')
			.withIndex('by_file_key', (q) => q.eq('file', file).eq('key', key))
			.unique();
		const removed = await removeTag(ctx, {
			owner,
			file,
			author,
			key,
			shouldCreateAction: false,
		});

		if (!removed || !existing) return '';

		const patch = `- tag ${existing.key}=${existing.value}`;
		if (shouldCreateAction) {
			await recordMutationAction(ctx, {
				owner,
				file,
				author,
				skillKey: actionSkill,
				args: { key },
				patch,
			});
		}

		return patch;
	},
});

export const copyFile = defineMutation({
	args: z.object({
		owner: zid('users'),
		source: zid('files'),
		parent: zid('files').optional(),
		name: z.string().min(1),
		author: authorSchema,
		kind: fileLinkKindSchema.default('copy'),
	}),
	handler: async (ctx, { owner, source, parent, name, author, kind }) => {
		//
		const sourceFile = await ensureFileVisible(ctx, { fileId: source, viewer: owner });
		let content: string | undefined;
		if (sourceFile.currentContent?.kind === 'text') {
			content = await readCurrentText(ctx, { file: sourceFile });
		}

		const tags = await ctx.db
			.query('file_tags')
			.withIndex('by_file', (q) => q.eq('file', source))
			.collect();
		const fileId = await createFile(ctx, {
			owner,
			parent,
			name,
			author,
			content,
			provider: sourceFile.provider,
			providerReference: sourceFile.providerReference,
			tags: tags.map((tag) => ({ key: tag.key, value: tag.value })),
			shouldAddInboxTag: false,
			shouldCreateAction: false,
		});

		if (sourceFile.currentContent?.kind === 'object') {
			await ctx.db.patch(fileId, {
				currentContent: sourceFile.currentContent,
				updatedAt: Date.now(),
			});
		}

		await ctx.db.insert('file_links', {
			owner,
			from: fileId,
			to: source,
			kind,
			author,
			createdAt: Date.now(),
		});

		await recordMutationAction(ctx, {
			owner,
			file: fileId,
			author,
			skillKey: kind,
			args: {
				source,
				parent,
				name,
			},
			patch: [`+ file ${name}`]
				.concat(tags.map((tag) => `+ tag ${tag.key}=${tag.value}`))
				.concat([`+ link ${kind} ${source}`])
				.join('\n'),
		});

		return fileId;
	},
});

export const adjustFileBudget = defineMutation({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
		author: authorSchema,
		amount: z.bigint(),
	}),
	handler: async (ctx, { owner, file, author, amount }) => {
		//
		const fileRecord = await ensureFileOwner(ctx, { fileId: file, owner });
		const user = await ctx.db.get(owner);
		if (!user) throw NotFound();

		const budget = fileRecord.budget ?? {
			total: 0n,
			available: 0n,
			reserved: 0n,
			spent: 0n,
		};

		if (amount > 0n) {
			const committed = user.committedBudgetUSD ?? 0n;
			const uncommittedBalance = (user.balanceUSD ?? 0n) - committed;
			if (uncommittedBalance < amount)
				throw InsufficientAccountFunds('Not enough wallet balance to commit this energy.');

			await ctx.db.patch(owner, {
				committedBudgetUSD: committed + amount,
			});
			await ctx.db.patch(file, {
				budget: {
					...budget,
					total: budget.total + amount,
					available: budget.available + amount,
				},
				updatedAt: Date.now(),
			});
		}

		if (amount < 0n) {
			const decrease = -amount;
			if (budget.available < decrease) throw new Error('Cannot decrease more than the available file budget.');

			await ctx.db.patch(owner, {
				committedBudgetUSD: (user.committedBudgetUSD ?? 0n) - decrease,
			});
			await ctx.db.patch(file, {
				budget: {
					...budget,
					total: budget.total - decrease,
					available: budget.available - decrease,
				},
				updatedAt: Date.now(),
			});
		}

		await recordMutationAction(ctx, {
			owner,
			file,
			author,
			skillKey: 'changeEnergy',
			args: { amount },
			patch: `~ budget ${amount > 0n ? '+' : ''}${amount}`,
		});
	},
});

export const releaseAvailableFileBudget = defineMutation({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
		author: authorSchema,
		actionSkill: z.string().min(1),
		shouldCreateAction: z.boolean().default(true),
	}),
	handler: async (ctx, { owner, file, author, actionSkill, shouldCreateAction }) => {
		//
		const fileRecord = await ensureFileOwner(ctx, { fileId: file, owner });
		const budget = fileRecord.budget;
		if (!budget || budget.available === 0n) return '';

		const user = await ctx.db.get(owner);
		if (!user) throw NotFound();

		await ctx.db.patch(owner, {
			committedBudgetUSD: safeSubtract(user.committedBudgetUSD ?? 0n, budget.available),
		});
		await ctx.db.patch(file, {
			budget: {
				...budget,
				total: safeSubtract(budget.total, budget.available),
				available: 0n,
			},
			updatedAt: Date.now(),
		});

		const patch = `~ budget -${budget.available}`;
		if (shouldCreateAction) {
			await recordMutationAction(ctx, {
				owner,
				file,
				author,
				skillKey: actionSkill,
				args: {
					amount: -budget.available,
					reason: 'release available energy',
				},
				patch,
			});
		}

		return patch;
	},
});

export const setObjectContentPointer = defineMutation({
	args: z.object({
		owner: zid('users'),
		fileId: zid('files'),
		author: authorSchema,
		pointer: objectContentPointerSchema,
	}),
	handler: async (ctx, { owner, fileId, author, pointer }) => {
		//
		await ensureFileOwner(ctx, { fileId, owner });
		const now = Date.now();

		await ctx.db.patch(fileId, {
			currentContent: pointer,
			updatedAt: now,
		});

		await recordMutationAction(ctx, {
			owner,
			file: fileId,
			author,
			skillKey: 'writeObject',
			args: {
				storageKey: pointer.storageKey,
				size: pointer.size,
				contentType: pointer.contentType,
			},
			patch: `~ content object ${pointer.storageKey}`,
		});
	},
});

async function writeTextPointer(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		fileId: Id<'files'>;
		author: z.infer<typeof authorSchema>;
		text: string;
		now: number;
	},
) {
	//
	assertInlineTextSize(args.text);

	const contentId = await ctx.db.insert('file_contents', {
		owner: args.owner,
		file: args.fileId,
		author: args.author,
		text: args.text,
		createdAt: args.now,
	});

	await ctx.db.patch(args.fileId, {
		currentContent: {
			kind: 'text',
			content: contentId,
		},
		updatedAt: args.now,
	});
}

function assertInlineTextSize(text: string) {
	//
	const size = new TextEncoder().encode(text).byteLength;
	if (size <= env.MAX_REACTOR_INLINE_CONTENT_BYTES) return;

	throw new Error('Inline text content is too large; use the object storage write path.');
}

async function readCurrentText(
	ctx: QueryCtx | MutationCtx,
	args: {
		file: Doc<'files'>;
	},
): Promise<string> {
	//
	const pointer = args.file.currentContent;
	if (!pointer || pointer.kind !== 'text') return '';

	const content = await ctx.db.get(pointer.content);
	return content?.text ?? '';
}

export async function renderCurrentContent(
	ctx: QueryCtx | MutationCtx,
	args: {
		file: Doc<'files'>;
	},
) {
	//
	const pointer = args.file.currentContent;
	if (!pointer) return '';
	if (pointer.kind === 'text') return await readCurrentText(ctx, args);

	return [
		`<object-content storageKey="${pointer.storageKey}" size="${pointer.size}"${pointer.contentType ? ` contentType="${pointer.contentType}"` : ''}>`,
		'Use cat, head, or tail through the file command path to read this object-backed content.',
		'</object-content>',
	].join('\n');
}

async function loadTaggedFiles(
	ctx: QueryCtx | MutationCtx,
	args: {
		tags: Doc<'file_tags'>[];
	},
): Promise<Doc<'files'>[]> {
	//
	const files = [];

	for (const tag of args.tags) {
		const file = await ctx.db.get(tag.file);
		if (file) files.push(file);
	}

	return files;
}

async function buildTree(
	ctx: QueryCtx,
	args: {
		owner: Id<'users'>;
		file: Doc<'files'>;
		depth: number;
		maxDepth: number;
	},
): Promise<FileTreeNode> {
	//
	if (args.depth >= args.maxDepth) {
		return {
			file: args.file,
			children: [],
		};
	}

	const children = await ctx.db
		.query('files')
		.withIndex('by_parent', (q) => q.eq('parent', args.file._id))
		.collect();
	const childTrees = [];

	for (const child of children) {
		if (child.owner !== args.owner) continue;
		childTrees.push(
			await buildTree(ctx, {
				owner: args.owner,
				file: child,
				depth: args.depth + 1,
				maxDepth: args.maxDepth,
			}),
		);
	}

	return {
		file: args.file,
		children: childTrees,
	};
}

async function hasPublicAncestor(
	ctx: QueryCtx | MutationCtx,
	args: {
		file: Doc<'files'>;
	},
) {
	//
	let parent = args.file.parent;

	for (let depth = 0; parent && depth < 64; depth += 1) {
		const file = await ctx.db.get(parent);
		if (!file) return false;
		if (file.isPublic === true) return true;
		parent = file.parent;
	}

	return false;
}

async function buildPath(
	ctx: QueryCtx | MutationCtx,
	args: {
		file: Doc<'files'>;
	},
): Promise<string> {
	//
	const parts = [args.file.name];
	let parent = args.file.parent;

	for (let depth = 0; parent && depth < 64; depth += 1) {
		const file = await ctx.db.get(parent);
		if (!file) break;
		parts.unshift(file.name);
		parent = file.parent;
	}

	return `/${parts.join('/')}`;
}

async function buildPathForParts(
	ctx: QueryCtx | MutationCtx,
	args: {
		owner: Id<'users'>;
		parent?: Id<'files'>;
		name: string;
	},
): Promise<string> {
	//
	if (!args.parent) return `/${args.name}`;

	const parent = await ensureFileOwner(ctx, {
		fileId: args.parent,
		owner: args.owner,
	});
	const parentPath = await buildPath(ctx, { file: parent });

	return `${parentPath}/${args.name}`;
}

function mergeInitialTags(args: { tags: Array<z.infer<typeof fileTagInputSchema>>; shouldAddInboxTag: boolean }) {
	//
	const tags = args.shouldAddInboxTag ? [{ key: 'inbox', value: 'true' }].concat(args.tags) : args.tags;
	const byKey = new Map<string, z.infer<typeof fileTagInputSchema>>();

	for (const tag of tags) {
		byKey.set(tag.key, tag);
	}

	return Array.from(byKey.values());
}

function createFileActionSkill() {
	//
	return 'createFile';
}

function safeSubtract(value: bigint, amount: bigint) {
	//
	return value > amount ? value - amount : 0n;
}

function deriveState(args: {
	latestAction: Doc<'actions'> | null;
	recentActions: Doc<'actions'>[];
	readCursor: Doc<'reads'> | null;
}) {
	//
	let isActing = false;
	let isBlocked = false;

	for (const action of args.recentActions) {
		if (action.status === 'running') isActing = true;
		if (action.status === 'pending authorization') isBlocked = true;
	}

	return {
		latestActionIndex: args.latestAction?.index ?? -1,
		lastReadActionIndex: args.readCursor?.lastReadActionIndex ?? -1,
		isUnread: (args.latestAction?.index ?? -1) > (args.readCursor?.lastReadActionIndex ?? -1),
		isActing,
		isBlocked,
	};
}
