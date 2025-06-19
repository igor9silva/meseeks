import { z } from 'zod';
import { mutation, query } from '../lib';
import { current as getCurrentUser } from '../users/public';
import { _addSubscription, _getUserSubscriptions, _removeSubscription } from './private';

export const subscribe = mutation({
	args: {
		subscription: z.object({
			endpoint: z.string().url(),
			keys: z.object({
				p256dh: z.string(),
				auth: z.string(),
			}),
		}),
		userAgent: z.string().optional(),
	},
	handler: async (ctx, { subscription, userAgent }) => {
		//
		const user = await getCurrentUser(ctx, {});

		return await _addSubscription(ctx, {
			userId: user._id,
			subscription,
			userAgent,
		});
	},
});

export const unsubscribe = mutation({
	args: {
		endpoint: z.string().url(),
	},
	handler: async (ctx, { endpoint }) => {
		//
		const user = await getCurrentUser(ctx, {});

		return await _removeSubscription(ctx, {
			userId: user._id,
			endpoint,
		});
	},
});

export const getSubscriptions = query({
	args: {},
	handler: async (ctx) => {
		//
		const user = await getCurrentUser(ctx, {});

		return await _getUserSubscriptions(ctx, {
			userId: user._id,
		});
	},
});
