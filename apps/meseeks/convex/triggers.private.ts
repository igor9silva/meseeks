import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { listAncestorDirectories } from './budgets.private';
import { proDirectoryName, triggerDirectoryName } from './fileConstants.private';
import { ensureOwnedDirectory, ensureOwnedFile } from './ownership.private';
import { findChildByName, findPathForOwner } from './paths.private';
import { readRevisionContent } from './revisions.private';
import { now } from './time.private';
import { getCurrentUser } from './users.private';

type TriggerFileResult = {
	directory: Id<'files'>;
	file: Doc<'files'>;
	content?: string;
};

const findTriggerDirectory = async (
	ctx: QueryCtx | MutationCtx,
	{ owner, directory }: { owner: Id<'users'>; directory: Id<'files'> },
) => {
	const directoryDoc = await ensureOwnedDirectory(ctx, { directory, owner });
	const proFolder = await findChildByName(ctx, {
		owner,
		parent: directoryDoc._id,
		name: proDirectoryName,
	});
	if (!proFolder || proFolder.kind !== 'folder') return null;

	const triggerFolder = await findChildByName(ctx, {
		owner,
		parent: proFolder._id,
		name: triggerDirectoryName,
	});
	if (!triggerFolder || triggerFolder.kind !== 'folder') return null;
	return triggerFolder;
};

const listTriggerFilesInDirectory = async (
	ctx: QueryCtx | MutationCtx,
	{ owner, directory }: { owner: Id<'users'>; directory: Id<'files'> },
) => {
	const triggerFolder = await findTriggerDirectory(ctx, { owner, directory });
	if (!triggerFolder) return [];

	const triggerFiles = await ctx.db
		.query('files')
		.withIndex('by_owner_parent_isDeleted', (q) =>
			q
				.eq('owner', owner) //
				.eq('parent', triggerFolder._id)
				.eq('isDeleted', false),
		)
		.collect();

	return triggerFiles.filter((file) => file.kind === 'file' && file.name.endsWith('.js'));
};

export const listTriggers = async (ctx: QueryCtx, { directory }: { directory: Id<'files'> }) => {
	const currentUser = await getCurrentUser(ctx, {});
	await ensureOwnedDirectory(ctx, { directory, owner: currentUser._id });
	const triggerFiles = await listTriggerFilesInDirectory(ctx, { owner: currentUser._id, directory });

	const results = [];
	for (const triggerFile of triggerFiles) {
		const index = await ctx.db
			.query('triggers')
			.withIndex('by_sourceFile', (q) => q.eq('sourceFile', triggerFile._id))
			.first();
		results.push({ file: triggerFile, index });
	}

	return results;
};

export const findTriggerFiles = async (
	ctx: QueryCtx,
	{ owner, directory }: { owner: Id<'users'>; directory: Id<'files'> },
) => {
	await ensureOwnedDirectory(ctx, { directory, owner });
	const triggerFiles = await listTriggerFilesInDirectory(ctx, { owner, directory });
	const result: TriggerFileResult[] = [];
	for (const triggerFile of triggerFiles) {
		result.push({
			directory,
			file: triggerFile,
			content: await readRevisionContent(ctx, triggerFile.currentRevision),
		});
	}

	return result;
};

export const findActionTriggerFiles = async (
	ctx: QueryCtx,
	{ owner, directory }: { owner: Id<'users'>; directory: Id<'files'> },
) => {
	const ancestors = await listAncestorDirectories(ctx, { owner, directory });
	const result: TriggerFileResult[] = [];
	for (const ancestor of ancestors) {
		const triggers = await findTriggerFiles(ctx, { owner, directory: ancestor._id });
		result.push(...triggers);
	}

	return result;
};

export const findMutationTriggerFiles = async (
	ctx: QueryCtx,
	{
		owner,
		directory,
		changedPaths,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		changedPaths: string[];
	},
) => {
	const directories = new Map<string, Id<'files'>>();
	const actionAncestors = await listAncestorDirectories(ctx, { owner, directory });
	for (const ancestor of actionAncestors) {
		directories.set(ancestor._id, ancestor._id);
	}

	for (const changedPath of changedPaths) {
		const file = await findPathForOwner(ctx, { owner, path: changedPath });
		if (!file) continue;
		const triggerDirectory = file.kind === 'folder' ? file._id : file.parent;
		if (!triggerDirectory) continue;
		const ancestors = await listAncestorDirectories(ctx, { owner, directory: triggerDirectory });
		for (const ancestor of ancestors) {
			directories.set(ancestor._id, ancestor._id);
		}
	}

	const result: TriggerFileResult[] = [];
	for (const triggerDirectory of directories.values()) {
		const triggers = await findTriggerFiles(ctx, { owner, directory: triggerDirectory });
		result.push(...triggers);
	}

	return result;
};

export const getTriggerFileAuthor = async (
	ctx: QueryCtx,
	{
		owner,
		sourceFile,
	}: {
		owner: Id<'users'>;
		sourceFile: Id<'files'>;
	},
) => {
	const file = await ensureOwnedFile(ctx, { file: sourceFile, owner });
	if (!file.currentRevision) return null;
	const revision = await ctx.db.get(file.currentRevision);
	if (!revision || revision.owner !== owner) return null;
	return revision.action;
};

export const upsertTrigger = async (
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		sourceFile: Id<'files'>;
		path: string;
		hash: string;
		status: 'indexed' | 'failed';
		author: { kind: 'user'; user: Id<'users'> } | { kind: 'action'; action: Id<'actions'> };
		trigger: { kind: 'mutation' } | { kind: 'action' } | { kind: 'code' };
		config?: {
			maxUses?: number;
			timeoutMs?: number;
			maxProposals?: number;
		};
		lastError?: string;
		didRun: boolean;
	},
) => {
	await ensureOwnedDirectory(ctx, { directory: args.directory, owner: args.owner });
	await ensureOwnedFile(ctx, { file: args.sourceFile, owner: args.owner });
	const existing = await ctx.db
		.query('triggers')
		.withIndex('by_sourceFile', (q) => q.eq('sourceFile', args.sourceFile))
		.first();

	const patch = {
		directory: args.directory,
		path: args.path,
		hash: args.hash,
		status: args.status,
		author: args.author,
		trigger: args.trigger,
		config: args.config,
		lastError: args.lastError,
		lastRunAt: args.didRun ? now() : undefined,
		updatedAt: now(),
	};

	if (existing) {
		await ctx.db.patch(existing._id, {
			...patch,
			runCount: existing.runCount + (args.didRun ? 1 : 0),
		});
		return existing._id;
	}

	return await ctx.db.insert('triggers', {
		owner: args.owner,
		directory: args.directory,
		sourceFile: args.sourceFile,
		path: args.path,
		hash: args.hash,
		status: args.status,
		author: args.author,
		trigger: args.trigger,
		config: args.config,
		lastError: args.lastError,
		lastRunAt: args.didRun ? now() : undefined,
		runCount: args.didRun ? 1 : 0,
		createdAt: now(),
		updatedAt: now(),
	});
};
