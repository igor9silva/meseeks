import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { managedLoopTriggers, managedTriggerHandlers } from 'lib/proDefinitions';
import { authorSchema } from 'schemas/authorSchema';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { catFile, createFile, ensureFileOwner, findChildByName, writeFileContent } from './files.private';
import { findLoopByKey, isLoopVisibleToOwner } from './loops.private';
import { recordMutationAction } from './reactor.private';

// Convex stores a finite number; Reactor treats this sentinel as unlimited trigger uses.
export const TRIGGER_MAX_USES_UNLIMITED = Number.MAX_SAFE_INTEGER;

const triggerMaxUsesSchema = z.number().int().nonnegative().default(TRIGGER_MAX_USES_UNLIMITED);

export const seedManagedLoopTriggers = defineMutation({
	args: z.object({
		owner: zid('users'),
		author: authorSchema,
		auditFile: zid('files'),
	}),
	handler: async (ctx, { owner, author, auditFile }) => {
		//
		await ensureFileOwner(ctx, {
			owner,
			fileId: auditFile,
		});

		const handlerFiles = await seedManagedTriggerHandlerFiles(ctx, {
			owner,
			author,
			parent: auditFile,
		});
		const triggerIds = [];

		for (const registration of managedLoopTriggers) {
			const loop = await findLoopByKey(ctx, { owner, key: registration.loopKey });
			const handler = handlerFiles.get(registration.handlerKey);
			if (!loop || !handler) continue;

			triggerIds.push(
				await upsertLoopTrigger(ctx, {
					owner,
					loop: loop._id,
					handler,
					author,
					auditFile,
				}),
			);
		}

		return triggerIds;
	},
});

export const upsertFileTrigger = defineMutation({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
		handler: zid('files'),
		maxUses: triggerMaxUsesSchema,
		author: authorSchema,
		auditFile: zid('files').optional(),
	}),
	handler: async (ctx, { owner, file, handler, maxUses, author, auditFile }) => {
		//
		await ensureFileOwner(ctx, { owner, fileId: file });
		await ensureFileOwner(ctx, { owner, fileId: handler });
		if (auditFile) await ensureFileOwner(ctx, { owner, fileId: auditFile });

		const existing = await findFileTriggerByHandler(ctx, { file, handler });
		if (existing) {
			if (existing.maxUses === maxUses) return existing._id;

			await ctx.db.patch(existing._id, {
				maxUses,
				author,
				updatedAt: Date.now(),
			});
			await recordTriggerMutationAction(ctx, {
				owner,
				file: auditFile ?? file,
				author,
				handler,
				isUpdate: true,
			});
			return existing._id;
		}

		const now = Date.now();
		const triggerId = await ctx.db.insert('triggers', {
			kind: 'file',
			owner,
			file,
			handler,
			maxUses,
			uses: 0,
			author,
			createdAt: now,
			updatedAt: now,
		});
		await recordTriggerMutationAction(ctx, {
			owner,
			file: auditFile ?? file,
			author,
			handler,
			isUpdate: false,
		});

		return triggerId;
	},
});

export const createFileTrigger = defineMutation({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
		handler: zid('files'),
		maxUses: triggerMaxUsesSchema,
		author: authorSchema,
		auditFile: zid('files').optional(),
	}),
	handler: async (ctx, { owner, file, handler, maxUses, author, auditFile }) => {
		//
		await ensureFileOwner(ctx, { owner, fileId: file });
		await ensureFileOwner(ctx, { owner, fileId: handler });
		if (auditFile) await ensureFileOwner(ctx, { owner, fileId: auditFile });

		const now = Date.now();
		const triggerId = await ctx.db.insert('triggers', {
			kind: 'file',
			owner,
			file,
			handler,
			maxUses,
			uses: 0,
			author,
			createdAt: now,
			updatedAt: now,
		});
		await recordTriggerMutationAction(ctx, {
			owner,
			file: auditFile ?? file,
			author,
			handler,
			isUpdate: false,
		});

		return triggerId;
	},
});

export const upsertLoopTrigger = defineMutation({
	args: z.object({
		owner: zid('users'),
		loop: zid('loops'),
		handler: zid('files'),
		maxUses: triggerMaxUsesSchema,
		author: authorSchema,
		auditFile: zid('files'),
	}),
	handler: async (ctx, { owner, loop, handler, maxUses, author, auditFile }) => {
		//
		const loopRecord = await ctx.db.get(loop);
		if (!loopRecord || loopRecord.owner !== owner) throw NotFound();
		await ensureFileOwner(ctx, { owner, fileId: handler });
		await ensureFileOwner(ctx, { owner, fileId: auditFile });

		const existing = await findLoopTriggerByHandler(ctx, { loop, handler });
		if (existing) {
			if (existing.maxUses === maxUses) return existing._id;

			await ctx.db.patch(existing._id, {
				maxUses,
				author,
				updatedAt: Date.now(),
			});
			await recordTriggerMutationAction(ctx, {
				owner,
				file: auditFile,
				author,
				handler,
				isUpdate: true,
			});
			return existing._id;
		}

		const now = Date.now();
		const triggerId = await ctx.db.insert('triggers', {
			kind: 'loop',
			owner,
			loop,
			handler,
			maxUses,
			uses: 0,
			author,
			createdAt: now,
			updatedAt: now,
		});
		await recordTriggerMutationAction(ctx, {
			owner,
			file: auditFile,
			author,
			handler,
			isUpdate: false,
		});

		return triggerId;
	},
});

export const removeTrigger = defineMutation({
	args: z.object({
		owner: zid('users'),
		triggerId: zid('triggers'),
		author: authorSchema,
		auditFile: zid('files').optional(),
	}),
	handler: async (ctx, { owner, triggerId, author, auditFile }) => {
		//
		const trigger = await ctx.db.get(triggerId);
		if (!trigger || trigger.owner !== owner) throw NotFound();
		if (auditFile) await ensureFileOwner(ctx, { owner, fileId: auditFile });

		await ctx.db.delete(triggerId);
		await recordTriggerMutationAction(ctx, {
			owner,
			file: auditFile ?? trigger.handler,
			author,
			handler: trigger.handler,
			isUpdate: false,
			isDelete: true,
		});

		return true;
	},
});

export const eligibleFileTriggers = defineQuery({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
	}),
	handler: async (ctx, { owner, file }) => {
		//
		await ensureFileOwner(ctx, { owner, fileId: file });
		const triggers = await ctx.db
			.query('triggers')
			.withIndex('by_file', (q) => q.eq('file', file))
			.collect();

		return triggers.filter(
			(trigger) => trigger.kind === 'file' && trigger.owner === owner && isTriggerEligible(trigger),
		);
	},
});

export const eligibleLoopTriggers = defineQuery({
	args: z.object({
		owner: zid('users'),
		loop: zid('loops'),
	}),
	handler: async (ctx, { owner, loop }) => {
		//
		const loopRecord = await ctx.db.get(loop);
		if (!loopRecord || !isLoopVisibleToOwner({ loop: loopRecord, owner })) throw NotFound();
		const triggers = await ctx.db
			.query('triggers')
			.withIndex('by_loop', (q) => q.eq('loop', loop))
			.collect();

		return triggers.filter(
			(trigger) => trigger.kind === 'loop' && trigger.owner === loopRecord.owner && isTriggerEligible(trigger),
		);
	},
});

export function isTriggerEligible(trigger: Doc<'triggers'>) {
	//
	return trigger.uses < trigger.maxUses;
}

async function seedManagedTriggerHandlerFiles(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		author: z.infer<typeof authorSchema>;
		parent: Id<'files'>;
	},
) {
	//
	const directory = await ensureTriggerDirectory(ctx, args);
	const files = new Map<string, Id<'files'>>();

	for (const handler of managedTriggerHandlers) {
		const existing = await findChildByName(ctx, {
			owner: args.owner,
			parent: directory,
			name: handler.name,
		});

		if (existing) {
			if (existing.isPublic !== true) {
				await ctx.db.patch(existing._id, {
					isPublic: true,
					updatedAt: Date.now(),
				});
			}
			const current = await catFile(ctx, {
				owner: args.owner,
				fileId: existing._id,
			});
			if (current !== handler.body) {
				await writeFileContent(ctx, {
					owner: args.owner,
					fileId: existing._id,
					author: args.author,
					content: handler.body,
				});
			}
			files.set(handler.key, existing._id);
			continue;
		}

		const handlerId = await createFile(ctx, {
			owner: args.owner,
			parent: directory,
			name: handler.name,
			author: args.author,
			content: handler.body,
			isPublic: true,
			tags: [
				{ key: 'kind', value: 'trigger-handler' },
				{ key: 'key', value: handler.key },
			],
			shouldAddInboxTag: false,
		});
		files.set(handler.key, handlerId);
	}

	return files;
}

async function ensureTriggerDirectory(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		author: z.infer<typeof authorSchema>;
		parent: Id<'files'>;
	},
) {
	//
	const existing = await findChildByName(ctx, {
		owner: args.owner,
		parent: args.parent,
		name: 'triggers',
	});
	if (existing) return existing._id;

	return await createFile(ctx, {
		owner: args.owner,
		parent: args.parent,
		name: 'triggers',
		author: args.author,
		tags: [{ key: 'kind', value: 'directory' }],
		shouldAddInboxTag: false,
	});
}

async function findFileTriggerByHandler(
	ctx: QueryCtx | MutationCtx,
	args: {
		file: Id<'files'>;
		handler: Id<'files'>;
	},
) {
	//
	const triggers = await ctx.db
		.query('triggers')
		.withIndex('by_file', (q) => q.eq('file', args.file))
		.collect();

	return triggers.find((trigger) => trigger.kind === 'file' && trigger.handler === args.handler);
}

async function findLoopTriggerByHandler(
	ctx: QueryCtx | MutationCtx,
	args: {
		loop: Id<'loops'>;
		handler: Id<'files'>;
	},
) {
	//
	const triggers = await ctx.db
		.query('triggers')
		.withIndex('by_loop', (q) => q.eq('loop', args.loop))
		.collect();

	return triggers.find((trigger) => trigger.kind === 'loop' && trigger.handler === args.handler);
}

async function recordTriggerMutationAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		file: Id<'files'>;
		author: z.infer<typeof authorSchema>;
		handler: Id<'files'>;
		isUpdate: boolean;
		isDelete?: boolean;
	},
) {
	//
	const actionName = args.isDelete ? 'deleteTrigger' : args.isUpdate ? 'updateTrigger' : 'createTrigger';
	const patchMark = args.isDelete ? '-' : args.isUpdate ? '~' : '+';
	await recordMutationAction(ctx, {
		owner: args.owner,
		file: args.file,
		author: args.author,
		skillKey: actionName,
		args: {
			handler: args.handler,
		},
		patch: `${patchMark} trigger handler ${args.handler}`,
	});
}
