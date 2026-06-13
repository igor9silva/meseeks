import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

export const nextActionIndex = async (ctx: QueryCtx | MutationCtx, { directory }: { directory: Id<'files'> }) => {
	const previous = await ctx.db
		.query('actions')
		.withIndex('by_directory_index', (q) => q.eq('directory', directory))
		.order('desc')
		.first();
	return (previous?.index ?? 0) + 1;
};
