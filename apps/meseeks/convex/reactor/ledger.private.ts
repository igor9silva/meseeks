'use node';

import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { deleteBodiesBestEffort, storeBody } from './storage.private';

export const startAction = async (
	ctx: ActionCtx,
	{
		owner,
		directory,
		skillKey,
		loopKey,
		intelligenceKey,
		args,
		depth,
		author,
		cause,
		spark,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		skillKey: string;
		loopKey?: string;
		intelligenceKey?: string;
		args: Record<string, unknown>;
		depth: number;
		author: { kind: 'user'; user: Id<'users'> } | { kind: 'action'; action: Id<'actions'> };
		cause?:
			| { kind: 'action'; action: Id<'actions'> }
			| { kind: 'trigger'; trigger: Id<'triggers'>; sourceAction?: Id<'actions'> }
			| { kind: 'boxTransaction'; detail: Id<'action_details'> };
		spark?: Id<'actions'>;
	},
): Promise<Id<'actions'>> =>
	await ctx.runMutation(internal.actions._startAction, {
		owner,
		directory,
		author,
		cause,
		spark,
		depth,
		skillKey,
		loopKey,
		intelligenceKey,
		args,
	});

export const finishAction = async (
	ctx: ActionCtx,
	{
		actionId,
		status,
		result,
		error,
	}: {
		actionId: Id<'actions'>;
		status: 'succeeded' | 'failed' | 'skipped';
		result?: Id<'files'>;
		error?: string;
	},
) =>
	await ctx.runMutation(internal.actions._finishAction, {
		action: actionId,
		status,
		result,
		error,
	});

export const recordWarning = async (
	ctx: ActionCtx,
	{
		owner,
		directory,
		actionId,
		message,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		actionId: Id<'actions'>;
		message: string;
	},
) =>
	await ctx.runMutation(internal.actions._recordDetail, {
		detail: {
			action: actionId,
			owner,
			directory,
			kind: 'warning',
			message,
			createdAt: Date.now(),
		},
	});

export const settleAction = async (
	ctx: ActionCtx,
	{
		owner,
		directory,
		actionId,
		status,
		result,
		error,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		actionId: Id<'actions'>;
		status: 'succeeded' | 'failed' | 'skipped';
		result?: string;
		error?: string;
	},
) => {
	let resultFileId: Id<'files'> | undefined;
	if (result !== undefined) {
		const storageKey = await storeBody({
			owner,
			actionId,
			content: result,
			contentType: 'text/mdx; charset=utf-8',
		});
		const written = await ctx
			.runMutation(internal.files._writeActionResultFile, {
				owner,
				directory,
				action: actionId,
				name: 'result.mdx',
				content: result,
				storageKey,
				contentType: 'text/mdx; charset=utf-8',
			})
			.catch(async (error: unknown) => {
				await deleteBodiesBestEffort([storageKey]);
				throw error;
			});
		resultFileId = written.file;
		await deleteBodiesBestEffort([written.previousStorageKey]);
	}
	await finishAction(ctx, {
		actionId,
		status,
		result: resultFileId,
		error,
	});
	await ctx.runMutation(internal.actions._claimAndScheduleNext, { owner, directory });
};
