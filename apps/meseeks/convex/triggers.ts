import { zid } from 'convex-helpers/server/zod3';
import { query } from 'lib/convex';
import { ensureScopeOwner } from './files.private';
import { findTriggersByRoot } from './triggers.private';
import { getCurrentUser } from './users.private';

export const findByRoot = query({
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

		return await findTriggersByRoot(ctx, {
			owner: currentUser._id,
			root: actionRoot._id,
		});
	},
});
