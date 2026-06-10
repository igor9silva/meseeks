import { z } from 'zod/v3';
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
	handler: async (ctx, { paginationOpts }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await ctx.db
			.query('transactions')
			.withIndex('by_owner', (q) => q.eq('owner', currentUser._id))
			.order('desc')
			.paginate(paginationOpts);
	},
});
