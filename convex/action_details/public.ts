import { zid } from 'convex-helpers/server/zod';
import { internal } from '../_generated/api';
import type { Doc } from '../_generated/dataModel';
import { query } from '../lib';
import { NotFound } from '../lib/errors';
import { current as getCurrentUser } from '../users/public';

export const findByAction = query({
	args: {
		actionId: zid('actions'),
	},
	handler: async (ctx, { actionId }): Promise<Doc<'action_details'> | null> => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		// get the action to verify ownership
		const action = await ctx.db.get(actionId);
		if (!action) throw NotFound();
		if (action.owner !== currentUser._id) throw NotFound();

		// get action details
		return await ctx.runQuery(internal.action_details.private._findByAction, {
			actionId,
		});
	},
});
