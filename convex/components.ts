import { z } from 'zod';
import { internalMutation, internalQuery, query } from './lib';
import { NotFound } from './lib/errors';
import { add, findOneBySlug as findOneComponentBySlug, findAll } from './components.private';
import { current } from './users.private';

export const _add = internalMutation({
	args: add.args.shape,
	handler: async (ctx, args) => {
		//
		return await add(ctx, args);
	},
});

export const _findAll = internalQuery({
	args: findAll.args.shape,
	handler: async (ctx, args) => {
		//
		return await findAll(ctx, args);
	},
});

export const _findOneBySlug = internalQuery({
	args: findOneComponentBySlug.args.shape,
	handler: async (ctx, args) => {
		//
		return await findOneComponentBySlug(ctx, args);
	},
});

export const findOneBySlug = query({
	args: {
		slug: z.string(),
	},
	handler: async (ctx, { slug }) => {
		//
		const currentUser = await current(ctx, {});
		const page = await findOneComponentBySlug(ctx, { slug, userId: currentUser._id });
		if (page) return page;

		throw NotFound();
	},
});
