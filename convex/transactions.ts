import { z } from 'zod';
import { query } from 'lib/convex';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import { getCurrentUser } from './users.private';

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
