import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';

export const findUserPreference = defineQuery({
	args: z.object({
		userId: zid('users'),
		key: z.string(),
	}),
	handler: async (ctx, { userId, key }) => {
		//
		return await ctx.db
			.query('user_preferences')
			.withIndex('by_owner_key', (q) => q.eq('owner', userId).eq('key', key))
			.unique();
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

export const clearUserPreference = defineMutation({
	args: z.object({
		userId: zid('users'),
		key: z.string(),
	}),
	handler: async (ctx, { userId, key }) => {
		//
		const preference = await findUserPreference(ctx, { userId, key });
		if (!preference) return;

		await ctx.db.delete(preference._id);
	},
});
