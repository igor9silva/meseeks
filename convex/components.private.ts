import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { componentSchema } from 'schemas/componentSchema';

export const addComponent = defineMutation({
	args: componentSchema,
	handler: async (ctx, component) => {
		//
		return await ctx.db.insert('components', component);
	},
});

export const findComponent = defineQuery({
	args: z.object({
		componentId: zid('components'),
	}),
	handler: async (ctx, { componentId }) => {
		//
		const component = await ctx.db.get(componentId);
		if (!component) throw NotFound();

		return component;
	},
});

export const findAllComponents = defineQuery({
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

export const findComponentBySlug = defineQuery({
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

export const shareComponentPublicly = defineMutation({
	args: z.object({
		owner: zid('users'),
		body: z.string().min(1),
	}),
	handler: async (ctx, { owner, body }) => {
		//
		const componentId = await addComponent(ctx, {
			isPublic: true,
			owner,
			body,
		});

		return { componentId };
	},
});
