import { zid } from 'convex-helpers/server/zod3';
import { internalMutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { findActionDetails, persistActionDetails, updateActionDetails } from './details.private';
import { getCurrentUser } from '../users.private';

// used by reactor claim to persist durable preflight details before an action is authorized
export const _persist = internalMutation({
	args: persistActionDetails.args.shape,
	handler: persistActionDetails,
});

// used by createAITool/createHttpTool to append runtime metadata after tool execution
export const _update = internalMutation({
	args: updateActionDetails.args.shape,
	handler: updateActionDetails,
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

		return await findActionDetails(ctx, { actionId });
	},
});
