import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { ensureOwnedDirectory } from './ownership.private';

const maxAncestorWalkDepth = 64;

export const listAncestorDirectories = async (
	ctx: QueryCtx | MutationCtx,
	{ owner, directory }: { owner: Id<'users'>; directory: Id<'files'> },
) => {
	const ancestors: Doc<'files'>[] = [];
	let current = await ensureOwnedDirectory(ctx, { directory, owner });

	for (let depth = 0; depth < maxAncestorWalkDepth; depth += 1) {
		ancestors.push(current);
		if (!current.parent) return ancestors;
		current = await ensureOwnedDirectory(ctx, { directory: current.parent, owner });
	}

	throw new Error('Directory ancestor chain exceeds the v1 limit.');
};

export const resolveBudgetFile = async (
	ctx: QueryCtx | MutationCtx,
	{ owner, directory }: { owner: Id<'users'>; directory: Id<'files'> },
) => {
	const ancestors = await listAncestorDirectories(ctx, { owner, directory });
	for (const candidate of ancestors) {
		if (candidate.budgetTotal !== undefined || candidate.budgetAvailable !== undefined) return candidate._id;
	}

	return undefined;
};
