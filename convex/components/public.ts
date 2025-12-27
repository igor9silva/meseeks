import { z } from 'zod';
import { query } from '../lib';
import { NotFound } from '../lib/errors';
import { current as getCurrentUser } from '../users/public';
import { _findOneBySlug } from './private';

export const findOneBySlug = query({
	args: {
		slug: z.string(),
	},
	handler: async (ctx, { slug }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		const page = await _findOneBySlug(ctx, { slug, userId: currentUser._id });
		if (!page) throw NotFound();

		return page;
	},
});
