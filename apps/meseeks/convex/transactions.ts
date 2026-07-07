import { z } from 'zod/v3';
import { internalMutation, query } from 'lib/convex';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import { addFreeCredits } from './transactions.private';
import { getCurrentUser } from './users.private';

// exposed internally so we can call from the Convex dashboard to grant free credits manually
export const _addFreeCredits = internalMutation({
	args: addFreeCredits.args.shape,
	handler: addFreeCredits,
});

export const findAll = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await ctx.db
			.query('transactions')
			.withIndex('by_owner', (q) => q.eq('owner', currentUser._id))
			.order('desc')
			.collect();
	},
});

export const findAllPaginated = query({
	args: {
		paginationOpts: paginationOptionsSchema,
		search: z.string().optional(),
	},
	handler: async (ctx, { paginationOpts, search }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		// Use search index if search term is provided
		if (search && search.trim()) {
			return await ctx.db
				.query('transactions')
				.withSearchIndex('search_transactions', (q) =>
					q.search('description', search.trim()).eq('owner', currentUser._id),
				)
				.paginate(paginationOpts);
		}

		// Default query without search
		return await ctx.db
			.query('transactions')
			.withIndex('by_owner', (q) => q.eq('owner', currentUser._id))
			.order('desc')
			.paginate(paginationOpts);
	},
});
