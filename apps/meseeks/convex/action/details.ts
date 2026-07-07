import { zid } from 'convex-helpers/server/zod3';
import { internalMutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { findActionDetails, recordActionDetail } from './details.private';
import { getCurrentUser } from '../users.private';

// called by Reactor internals when an internal action needs to record post-call details.
export const _record = internalMutation({
	args: recordActionDetail.args.shape,
	handler: recordActionDetail,
});

export const find = query({
	args: {
		actionId: zid('actions'),
	},
	handler: async (ctx, { actionId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		// get the action to verify ownership
		const action = await ctx.db.get(actionId);
		if (!action) throw NotFound();
		if (action.owner !== currentUser._id) throw NotFound();

		return await findActionDetails(ctx, { action: actionId });
	},
});
