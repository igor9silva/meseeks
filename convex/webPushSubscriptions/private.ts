import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internalMutation, internalQuery } from '../lib';

export const _addSubscription = internalMutation({
	args: {
		userId: zid('users'),
		subscription: z.object({
			endpoint: z.string().url(),
			keys: z.object({
				p256dh: z.string(),
				auth: z.string(),
			}),
		}),
		userAgent: z.string().optional(),
	},
	handler: async (ctx, { userId, subscription, userAgent }) => {
		//
		// check if subscription already exists for this endpoint
		const existing = await ctx.db
			.query('webPushSubscriptions')
			.withIndex('by_endpoint', (q) => q.eq('subscription.endpoint', subscription.endpoint))
			.unique();

		if (existing) {
			// update existing subscription
			await ctx.db.patch(existing._id, {
				userId,
				subscription,
				userAgent,
				lastUsedAt: Date.now(),
				isEnabled: true,
			});
			return existing._id;
		}

		// create new subscription
		return await ctx.db.insert('webPushSubscriptions', {
			userId,
			subscription,
			userAgent,
			createdAt: Date.now(),
			lastUsedAt: Date.now(),
			isEnabled: true,
		});
	},
});

export const _removeSubscription = internalMutation({
	args: {
		userId: zid('users'),
		endpoint: z.string().url(),
	},
	handler: async (ctx, { userId, endpoint }) => {
		//
		const existing = await ctx.db
			.query('webPushSubscriptions')
			.withIndex('by_endpoint', (q) => q.eq('subscription.endpoint', endpoint))
			.filter((q) => q.eq(q.field('userId'), userId))
			.unique();

		if (existing) {
			await ctx.db.delete(existing._id);
		}
	},
});

export const _getUserSubscriptions = internalQuery({
	args: {
		userId: zid('users'),
	},
	handler: async (ctx, { userId }) => {
		//
		return await ctx.db
			.query('webPushSubscriptions')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.filter((q) => q.eq(q.field('isEnabled'), true))
			.collect();
	},
});

export const _disableSubscription = internalMutation({
	args: {
		subscriptionId: zid('webPushSubscriptions'),
	},
	handler: async (ctx, { subscriptionId }) => {
		//
		await ctx.db.patch(subscriptionId, {
			isEnabled: false,
		});
	},
});
