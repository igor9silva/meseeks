import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { NotFound } from 'lib/errors';
import { ensureCurrentUserDirectory, ensureOwnedDirectory } from './ownership.private';
import { now } from './time.private';

export const getBox = async (ctx: QueryCtx, { directory }: { directory: Id<'files'> }) => {
	const { currentUser } = await ensureCurrentUserDirectory(ctx, { directory });
	return await ctx.db
		.query('boxes')
		.withIndex('by_directory', (q) => q.eq('directory', directory))
		.filter((q) => q.eq(q.field('owner'), currentUser._id))
		.first();
};

export const getOrCreateBox = async (
	ctx: MutationCtx,
	{
		owner,
		directory,
		action,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		action: Id<'actions'>;
	},
) => {
	await ensureOwnedDirectory(ctx, { directory, owner });
	const existing = await ctx.db
		.query('boxes')
		.withIndex('by_directory', (q) => q.eq('directory', directory))
		.first();
	if (existing) return existing._id;

	const at = now();
	return await ctx.db.insert('boxes', {
		owner,
		directory,
		provider: 'daytona',
		status: 'idle',
		lastAction: action,
		lastChangedFiles: [],
		createdAt: at,
		updatedAt: at,
	});
};

export const updateBox = async (
	ctx: MutationCtx,
	{
		box,
		owner,
		status,
		action,
		providerSandboxId,
		logs,
		changedFiles,
		lifecycle,
	}: {
		box: Id<'boxes'>;
		owner: Id<'users'>;
		status: 'idle' | 'running' | 'failed';
		action?: Id<'actions'>;
		providerSandboxId?: string;
		logs?: string;
		changedFiles?: string[];
		lifecycle?: Record<string, string>;
	},
) => {
	const doc = await ctx.db.get(box);
	if (!doc || doc.owner !== owner) throw NotFound();

	await ctx.db.patch(box, {
		status,
		lastAction: action,
		providerSandboxId,
		lastLogs: logs,
		lastChangedFiles: changedFiles,
		lifecycle,
		updatedAt: now(),
	});
};
