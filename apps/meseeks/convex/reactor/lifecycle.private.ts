'use node';

import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { performStartedAction } from './actionHandlers.private';
import type { SourceAuthor } from './causality.private';
import { startAction } from './ledger.private';

export const actArgsSchema = z.object({
	directory: zid('files').optional(),
	skillKey: z.string().min(1),
	loopKey: z.string().optional(),
	intelligenceKey: z.string().optional(),
	args: z.record(z.unknown()).default({}),
});

export const actHandler = async (ctx: ActionCtx, input: z.output<typeof actArgsSchema>): Promise<Id<'actions'>> => {
	const { skillKey, loopKey, intelligenceKey, args } = input;
	const currentUser = await ctx.runQuery(internal.actions._getCurrentUser, {});
	const directory = await ctx.runQuery(internal.files._resolveActionDirectory, {
		owner: currentUser._id,
		directory: input.directory,
	});
	const author: SourceAuthor = { kind: 'user', user: currentUser._id };
	const actionId = await startAction(ctx, {
		owner: currentUser._id,
		directory: directory._id,
		skillKey,
		loopKey,
		intelligenceKey,
		args,
		depth: 0,
		author,
	});

	await performStartedAction({
		ctx,
		owner: currentUser._id,
		directory: directory._id,
		actionId,
		skillKey,
		loopKey,
		intelligenceKey,
		args,
		depth: 0,
		author,
	});

	return actionId;
};

export const performScheduled = async (ctx: ActionCtx, { action }: { action: Id<'actions'> }) => {
	const actionDoc = await ctx.runQuery(internal.actions._getRunnableAction, { action });
	await performStartedAction({
		ctx,
		owner: actionDoc.owner,
		directory: actionDoc.directory,
		actionId: actionDoc._id,
		skillKey: actionDoc.skillKey,
		loopKey: actionDoc.loopKey,
		intelligenceKey: actionDoc.intelligenceKey,
		args: actionDoc.args,
		depth: actionDoc.depth,
		author: actionDoc.author,
	});
};
