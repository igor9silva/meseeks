import { z } from 'zod/v3';
import { query } from 'lib/convex';
import { findRouteBySlug } from './routes.private';
import { getCurrentUser } from './users.private';

export const findBySlug = query({
	args: {
		slug: z.string().min(1),
	},
	handler: async (ctx, { slug }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await findRouteBySlug(ctx, { owner: currentUser._id, slug });
	},
});
