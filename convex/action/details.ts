import { zid } from 'convex-helpers/server/zod';
import { internalMutation, query } from 'lib/functions';
import { NotFound } from 'lib/errors';
import { findByAction as findActionDetails, persist, update } from './details.private';
import { getCurrentUser } from '../users.private';

export const _persist = internalMutation({
	args: persist.args.shape,
	handler: persist,
});

export const _update = internalMutation({
	args: update.args.shape,
	handler: update,
});

export const findByAction = query({
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

		return await findActionDetails(ctx, { actionId });
	},
});
