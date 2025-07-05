import { zid } from 'convex-helpers/server/zod';
import { internalMutation, internalQuery } from '../lib';
import { actionDetailSchema } from '../schemas/actionDetailSchema';

export const _persist = internalMutation({
	args: {
		details: actionDetailSchema,
	},
	handler: async (ctx, { details }) => {
		//
		const existing = await _findByAction(ctx, { actionId: details.actionId });
		if (existing) throw new Error('Action detail already exists');

		return await ctx.db.insert('action_details', details);
	},
});

export const _findByAction = internalQuery({
	args: {
		actionId: zid('actions'),
	},
	handler: async (ctx, { actionId }) => {
		//
		return await ctx.db
			.query('action_details')
			.withIndex('by_action', (q) => q.eq('actionId', actionId))
			.unique();
	},
});
