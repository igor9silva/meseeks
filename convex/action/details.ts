import { zid } from 'convex-helpers/server/zod3';
import { internalMutation, internalQuery, query } from '../lib';
import { NotFound } from '../lib/errors';
import { findByAction as findActionDetails, persist, update } from './details.private';
import { current as getCurrentUser } from '../users.private';

export const _persist = internalMutation({
	args: persist.args.shape,
	handler: async (ctx, args) => {
		//
		return await persist(ctx, args);
	},
});

export const _update = internalMutation({
	args: update.args.shape,
	handler: async (ctx, args) => {
		//
		return await update(ctx, args);
	},
});

export const _findByAction = internalQuery({
	args: findActionDetails.args.shape,
	handler: async (ctx, args) => {
		//
		return await findActionDetails(ctx, args);
	},
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
