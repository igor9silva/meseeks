import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { defineMutation, defineQuery } from 'lib/functions';

const findUserPreference = async (
	ctx: QueryCtx | MutationCtx,
	{
		userId,
		key,
	}: {
		userId: Id<'users'>;
		key: string;
	},
) => {
	//
	return await ctx.db
		.query('user_preferences')
		.withIndex('by_owner_key', (q) => q.eq('owner', userId).eq('key', key))
		.unique();
};

export const getUserPreference = defineQuery({
	args: z.object({
		userId: zid('users'),
		key: z.string(),
	}),
	handler: async (ctx, { userId, key }) => {
		//
		return await findUserPreference(ctx, { userId, key });
	},
});

export const setUserPreference = defineMutation({
	args: z.object({
		userId: zid('users'),
		key: z.string(),
		value: z.unknown(),
	}),
	handler: async (ctx, { userId, key, value }) => {
		//
		const preference = await findUserPreference(ctx, { userId, key });

		if (!preference) {
			await ctx.db.insert('user_preferences', { owner: userId, key, value });
		} else {
			await ctx.db.patch(preference._id, { value });
		}
	},
});
