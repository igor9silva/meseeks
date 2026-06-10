import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { mutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { ensureFileOwner } from './files.private';
import { findLoopByKey } from './loops.private';
import {
	TRIGGER_MAX_USES_UNLIMITED,
	eligibleFileTriggers,
	eligibleLoopTriggers,
	removeTrigger,
	upsertFileTrigger,
	upsertLoopTrigger,
} from './triggers.private';
import { getCurrentUser } from './users.private';

const createFileTriggerSchema = z.object({
	kind: z.literal('file'),
	file: zid('files'),
	handler: zid('files'),
	maxUses: z.number().int().nonnegative().default(TRIGGER_MAX_USES_UNLIMITED),
});

const createLoopTriggerSchema = z.object({
	kind: z.literal('loop'),
	loop: zid('loops'),
	handler: zid('files'),
	maxUses: z.number().int().nonnegative().default(TRIGGER_MAX_USES_UNLIMITED),
});

const createTriggerSchema = z.union([createFileTriggerSchema, createLoopTriggerSchema]);

export const create = mutation({
	args: {
		registration: createTriggerSchema,
	},
	handler: async (ctx, { registration }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, {
			fileId: registration.handler,
			owner: currentUser._id,
		});

		if (registration.kind === 'file') {
			return await upsertFileTrigger(ctx, {
				owner: currentUser._id,
				author: currentUser._id,
				file: registration.file,
				handler: registration.handler,
				maxUses: registration.maxUses,
				auditFile: registration.file,
			});
		}

		if (!currentUser.rootFileId) throw NotFound();

		return await upsertLoopTrigger(ctx, {
			owner: currentUser._id,
			author: currentUser._id,
			loop: registration.loop,
			handler: registration.handler,
			maxUses: registration.maxUses,
			auditFile: currentUser.rootFileId,
		});
	},
});

export const eligibleForAction = query({
	args: {
		actionId: zid('actions'),
	},
	handler: async (ctx, { actionId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const action = await ctx.db.get(actionId);
		if (!action || action.owner !== currentUser._id) throw NotFound();
		await ensureFileOwner(ctx, {
			fileId: action.file,
			owner: currentUser._id,
		});

		const fileTriggers = await eligibleFileTriggers(ctx, {
			owner: currentUser._id,
			file: action.file,
		});
		if (!action.loopKey) return fileTriggers;

		const loop = await findLoopByKey(ctx, {
			owner: currentUser._id,
			key: action.loopKey,
		});
		if (!loop) return fileTriggers;

		const loopTriggers = await eligibleLoopTriggers(ctx, {
			owner: currentUser._id,
			loop: loop._id,
		});

		return fileTriggers.concat(loopTriggers);
	},
});

export const remove = mutation({
	args: {
		triggerId: zid('triggers'),
	},
	handler: async (ctx, { triggerId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await removeTrigger(ctx, {
			owner: currentUser._id,
			triggerId,
			author: currentUser._id,
			auditFile: currentUser.rootFileId,
		});
	},
});
