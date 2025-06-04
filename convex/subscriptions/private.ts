import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internalMutation, internalQuery } from '../lib';
import { authorSchema } from '../schemas/authorSchema';
import { subscriptionPlanSchema } from '../schemas/subscriptionSchema';
import { _addFreeCredits } from '../transactions/private';
import { _extendPro } from '../users/private';
import { NotFound } from '../utils/errors';

export const _add = internalMutation({
	args: {
		owner: zid('users'),
		author: authorSchema,
		plan: subscriptionPlanSchema,
		paymentUrl: z.string().url(),
		paymentId: z.string(),
	},
	handler: async (ctx, args) => {
		const subscriptionId = await ctx.db.insert('subscriptions', {
			...args,
			status: 'waiting' as const,
		});
		return subscriptionId;
	},
});

export const _activate = internalMutation({
	args: {
		checkoutId: z.string(),
		months: z.number(),
		credits: z.bigint(),
		founder: z.boolean().optional(),
	},
	handler: async (ctx, { checkoutId, months, credits, founder }) => {
		const sub = await _findOneByPaymentId(ctx, { paymentId: checkoutId });
		if (!sub) throw NotFound();
		if (sub.status !== 'waiting') throw new Error('Subscription not waiting');

		await ctx.db.patch(sub._id, {
			status: 'active',
			validUntil: Date.now() + months * 30 * 24 * 60 * 60 * 1000,
		});

		await _extendPro(ctx, { userId: sub.owner, months, founder: !!founder });

		if (credits > 0n) {
			await _addFreeCredits(ctx, {
				owner: sub.owner,
				value: { symbol: 'USD', amount: credits },
				description: 'Subscription credits',
			});
		}
	},
});

export const _persistPolarEvent = internalMutation({
	args: {
		polarEvent: z.any(),
	},
	handler: async (ctx, { polarEvent }) => {
		await ctx.db.insert('polarEvents', polarEvent);
	},
});

export const _findOneByPaymentId = internalQuery({
	args: {
		paymentId: z.string(),
	},
	handler: async (ctx, { paymentId }) => {
		return await ctx.db
			.query('subscriptions')
			.withIndex('by_paymentId', (q) => q.eq('paymentId', paymentId))
			.first();
	},
});

export const _findActive = internalQuery({
	args: { owner: zid('users') },
	handler: async (ctx, { owner }) => {
		const now = Date.now();
		return await ctx.db
			.query('subscriptions')
			.withIndex('by_owner_status', (q) => q.eq('owner', owner).eq('status', 'active'))
			.collect()
			.then((subs) => subs.filter((s) => (s.validUntil ?? 0) > now));
	},
});
