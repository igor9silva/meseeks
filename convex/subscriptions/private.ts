import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { Id } from '../_generated/dataModel';
import { internalMutation, internalQuery } from '../lib';
import { NotFound } from '../lib/errors';
import { _addSubscriptionCredits } from '../transactions/private';
import { _setFounder } from '../users/private';

export const _add = internalMutation({
	args: {
		owner: zid('users'),
		paymentUrl: z.string().url(),
		paymentId: z.string(),
	},
	handler: async (ctx, args): Promise<Id<'subscriptions'>> => {
		//
		const subscriptionId = await ctx.db.insert('subscriptions', {
			...args,
			status: 'pending' as const,
		});

		return subscriptionId;
	},
});

export const _activate = internalMutation({
	args: {
		checkoutId: z.string(),
		months: z.number(),
		credits: z.bigint(),
		isFounder: z.boolean().optional(),
	},
	handler: async (ctx, { checkoutId, months, credits, isFounder }) => {
		//
		const sub = await _findOneByPaymentId(ctx, { paymentId: checkoutId });

		if (!sub) throw NotFound();
		if (sub.status !== 'pending') throw new Error('Subscription not pending');

		await ctx.db.patch(sub._id, {
			status: 'active',
			validUntil: Date.now() + months * 30 * 24 * 60 * 60 * 1000,
		});

		if (Boolean(isFounder)) {
			await _setFounder(ctx, { userId: sub.owner, isFounder: true });
		}

		if (credits > 0n) {
			await _addSubscriptionCredits(ctx, {
				owner: sub.owner,
				value: { symbol: 'USD', amount: credits },
				description: 'Subscription credits',
				subscriptionId: sub._id,
			});
		}
	},
});

export const _findOneByPaymentId = internalQuery({
	args: {
		paymentId: z.string(),
	},
	handler: async (ctx, { paymentId }) => {
		//
		return await ctx.db
			.query('subscriptions')
			.withIndex('by_paymentId', (q) => q.eq('paymentId', paymentId))
			.first();
	},
});

export const _findOne = internalQuery({
	args: {
		subscriptionId: zid('subscriptions'),
	},
	handler: async (ctx, { subscriptionId }) => {
		//
		return await ctx.db.get(subscriptionId);
	},
});

export const _findActive = internalQuery({
	args: {
		owner: zid('users'),
	},
	handler: async (ctx, { owner }) => {
		//
		const now = Date.now();

		return await ctx.db
			.query('subscriptions')
			.withIndex('by_owner_status', (q) => q.eq('owner', owner).eq('status', 'active'))
			.collect()
			.then((subs) => subs.filter((s) => (s.validUntil ?? 0) > now));
	},
});
