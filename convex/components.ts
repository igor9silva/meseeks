import { z } from 'zod';
import { query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { findOneBySlug as findOneComponentBySlug } from './components.private';
import { getCurrentUser } from './users.private';

export const findOneBySlug = query({
	args: {
		slug: z.string(),
	},
	handler: async (ctx, { slug }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const page = await findOneComponentBySlug(ctx, { slug, userId: currentUser._id });

		if (page) return page;

		throw NotFound();
	},
});
