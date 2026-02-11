import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { defineMutation, defineQuery } from './lib';
import { componentSchema } from './schemas/componentSchema';

export const add = defineMutation({
	args: componentSchema,
	handler: async (ctx, { owner, body, defaultTaskId, slug }) => {
		//
		return await ctx.db.insert('components', {
			owner,
			body,
			defaultTaskId,
			slug,
		});
	},
});

export const findAll = defineQuery({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		//
		return await ctx.db
			.query('components')
			.withIndex('by_owner_slug', (q) => q.eq('owner', userId))
			.collect();
	},
});

export const findOneBySlug = defineQuery({
	args: z.object({
		slug: z.string(),
		userId: zid('users'),
	}),
	handler: async (ctx, { slug, userId }) => {
		//
		const users = await ctx.db
			.query('components')
			.withIndex('by_owner_slug', (q) => q.eq('owner', userId).eq('slug', slug))
			.unique();

		if (users) return users;

		const globals = await ctx.db
			.query('components')
			.withIndex('by_owner_slug', (q) => q.eq('owner', 'isPro').eq('slug', slug))
			.unique();

		return globals;
	},
});
