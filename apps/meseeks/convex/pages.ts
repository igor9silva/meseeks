import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { query } from 'lib/convex';
import { ensureScopeOwner } from './files.private';
import { findPageByRoute, listPagesForRoot } from './pages.private';
import { getCurrentUser } from './users.private';

export const listByRoot = query({
	args: {
		root: zid('files'),
	},
	handler: async (ctx, { root }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const actionRoot = await ensureScopeOwner(ctx, {
			owner: currentUser._id,
			directory: root,
		});

		return await listPagesForRoot(ctx, {
			owner: currentUser._id,
			root: actionRoot._id,
		});
	},
});

export const findByRoute = query({
	args: {
		root: zid('files'),
		route: z.string().min(1),
	},
	handler: async (ctx, { root, route }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const actionRoot = await ensureScopeOwner(ctx, {
			owner: currentUser._id,
			directory: root,
		});

		return await findPageByRoute(ctx, {
			owner: currentUser._id,
			root: actionRoot._id,
			route,
		});
	},
});
