import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { NotFound } from 'lib/errors';
import { actionAuthorSchema, actionDetailSchema, actionProposalSchema } from 'schemas/workspaceSchema';
import { nextActionIndex } from './actionIndex.private';
import { resolveBudgetFile } from './budgets.private';
import { ensureCurrentUserDirectory, ensureOwnedDirectory } from './ownership.private';
import { now } from './time.private';
import { getCurrentUser } from './users.private';
import { z } from 'zod/v3';

export const listActions = async (ctx: QueryCtx, { directory }: { directory: Id<'files'> }) => {
	const { currentUser } = await ensureCurrentUserDirectory(ctx, { directory });

	return await ctx.db
		.query('actions')
		.withIndex('by_directory', (q) => q.eq('directory', directory))
		.filter((q) => q.eq(q.field('owner'), currentUser._id))
		.order('desc')
		.collect();
};

export const listActionDetails = async (ctx: QueryCtx, { action }: { action: Id<'actions'> }) => {
	const currentUser = await getCurrentUser(ctx, {});
	const doc = await ctx.db.get(action);
	if (!doc || doc.owner !== currentUser._id) throw NotFound();

	return await ctx.db
		.query('action_details')
		.withIndex('by_action', (q) => q.eq('action', action))
		.collect();
};

export const startAction = async (
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		author: z.infer<typeof actionAuthorSchema>;
		cause?: Doc<'actions'>['cause'];
		spark?: Id<'actions'>;
		depth: number;
		skillKey: string;
		loopKey?: string;
		intelligenceKey?: string;
		args: Record<string, unknown>;
	},
) => {
	await ensureOwnedDirectory(ctx, { directory: args.directory, owner: args.owner });
	const at = now();
	const budgetFile = await resolveBudgetFile(ctx, { owner: args.owner, directory: args.directory });
	const action = await ctx.db.insert('actions', {
		owner: args.owner,
		directory: args.directory,
		index: await nextActionIndex(ctx, { directory: args.directory }),
		author: args.author,
		cause: args.cause,
		spark: args.spark,
		depth: args.depth,
		skillKey: args.skillKey,
		loopKey: args.loopKey,
		intelligenceKey: args.intelligenceKey,
		args: args.args,
		status: 'running',
		budgetFile,
		startedAt: at,
		createdAt: at,
		updatedAt: at,
	});
	if (!args.spark && args.author.kind === 'user') {
		await ctx.db.patch(action, {
			spark: action,
			updatedAt: at,
		});
	}
	return action;
};

export const finishAction = async (
	ctx: MutationCtx,
	{
		action,
		status,
		result,
		error,
	}: {
		action: Id<'actions'>;
		status: 'succeeded' | 'failed' | 'skipped';
		result?: Id<'files'>;
		error?: string;
	},
) => {
	const doc = await ctx.db.get(action);
	if (!doc) throw NotFound();

	await ctx.db.patch(action, {
		status,
		result,
		error,
		settledAt: now(),
		updatedAt: now(),
	});
};

export const getRunnableAction = async (ctx: QueryCtx, { action }: { action: Id<'actions'> }) => {
	const doc = await ctx.db.get(action);
	if (!doc) throw NotFound();
	if (doc.status !== 'running') {
		throw new Error(`Reactor action ${action} is ${doc.status}, not running.`);
	}

	return doc;
};

export const claimAndScheduleNext = async (
	ctx: MutationCtx,
	{ owner, directory }: { owner: Id<'users'>; directory: Id<'files'> },
) => {
	await ensureOwnedDirectory(ctx, { directory, owner });

	const runningAction = await ctx.db
		.query('actions')
		.withIndex('by_directory_status', (q) =>
			q
				.eq('directory', directory) //
				.eq('status', 'running'),
		)
		.filter((q) => q.eq(q.field('owner'), owner))
		.first();
	if (runningAction) return null;

	const nextAction = await ctx.db
		.query('actions')
		.withIndex('by_directory_status', (q) =>
			q
				.eq('directory', directory) //
				.eq('status', 'enqueued'),
		)
		.filter((q) => q.eq(q.field('owner'), owner))
		.first();
	if (!nextAction) return null;

	const scheduledFunctionId: Id<'_scheduled_functions'> = await ctx.scheduler.runAfter(
		0,
		internal.reactor._performScheduled,
		{ action: nextAction._id },
	);

	await ctx.db.patch(nextAction._id, {
		status: 'running',
		startedAt: now(),
		scheduledFunctionId,
		updatedAt: now(),
	});

	return {
		action: nextAction._id,
		scheduledFunctionId,
	};
};

export const recordDetail = async (ctx: MutationCtx, { detail }: { detail: z.infer<typeof actionDetailSchema> }) =>
	await ctx.db.insert('action_details', detail);

export const scheduleProposalAction = async (
	ctx: MutationCtx,
	{
		owner,
		directory,
		sourceAction,
		trigger,
		depth,
		proposal,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		sourceAction: Id<'actions'>;
		trigger: Id<'triggers'>;
		depth: number;
		proposal: z.infer<typeof actionProposalSchema>;
	},
) => {
	const resolvedDirectory = proposal.directory ?? directory;
	await ensureOwnedDirectory(ctx, { directory: resolvedDirectory, owner });
	const triggerDoc = await ctx.db.get(trigger);
	if (!triggerDoc || triggerDoc.owner !== owner) throw NotFound();
	let author: z.infer<typeof actionAuthorSchema>;
	let spark: Id<'actions'> | undefined;
	let actionDepth = depth;
	if (triggerDoc.author.kind === 'action') {
		const triggerAuthorAction = await ctx.db.get(triggerDoc.author.action);
		if (!triggerAuthorAction || triggerAuthorAction.owner !== owner) throw NotFound();
		author = {
			kind: 'action',
			action: triggerAuthorAction._id,
		};
		spark = triggerAuthorAction.spark ?? triggerAuthorAction._id;
		actionDepth = triggerAuthorAction.depth + 1;
	} else {
		author = {
			kind: 'user',
			user: triggerDoc.author.user,
		};
		const source = await ctx.db.get(sourceAction);
		spark = source?.spark ?? sourceAction;
	}
	const at = now();
	const action = await ctx.db.insert('actions', {
		owner,
		directory: resolvedDirectory,
		index: await nextActionIndex(ctx, { directory: resolvedDirectory }),
		author,
		cause: {
			kind: 'trigger',
			trigger,
			sourceAction,
		},
		spark,
		depth: actionDepth,
		skillKey: proposal.skillKey,
		intelligenceKey: proposal.intelligenceKey,
		args: proposal.args,
		status: 'enqueued',
		budgetFile: await resolveBudgetFile(ctx, { owner, directory: resolvedDirectory }),
		createdAt: at,
		updatedAt: at,
	});

	const scheduledFunctionId: Id<'_scheduled_functions'> = await ctx.scheduler.runAfter(
		0,
		internal.reactor._performScheduled,
		{ action },
	);

	await ctx.db.patch(action, {
		status: 'running',
		startedAt: now(),
		scheduledFunctionId,
		updatedAt: now(),
	});

	return action;
};
