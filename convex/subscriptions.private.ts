import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { Doc } from './_generated/dataModel';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { addSubscriptionCredits } from './transactions.private';
import { setFounder } from './users.private';

export const add = defineMutation({
	args: z.object({
		owner: zid('users'),
		paymentUrl: z.string().url(),
		paymentId: z.string(),
	}),
	handler: async (ctx, args) => {
		//
		return await ctx.db.insert('subscriptions', {
			...args,
			status: 'pending' as const,
		});
	},
});

export const activate = defineMutation({
	args: z.object({
		checkoutId: z.string(),
		months: z.number(),
		credits: z.bigint(),
		isFounder: z.boolean().optional(),
		isRenewal: z.boolean().optional().default(false),
		polarSubscriptionId: z.string().optional(),
	}),
	handler: async (ctx, args) => {
		//
		const { checkoutId, months, credits, isFounder, isRenewal, polarSubscriptionId } = args;
		const subscription = await findOneByPaymentId(ctx, { paymentId: checkoutId });

		if (!subscription) throw NotFound();
		if (!isRenewal && subscription.status !== 'pending') throw new Error('Subscription not pending');

		const now = Date.now();
		const validUntil = now + months * 30 * 24 * 60 * 60 * 1000; // months to milliseconds

		const updateData: Partial<Doc<'subscriptions'>> = {
			status: 'active' as const,
			isFounder: subscription.isFounder || isFounder,
			validUntil,
		};

		if (isRenewal) {
			updateData.renewalCount = (subscription.renewalCount ?? 0) + 1;
			updateData.lastRenewalDate = now;
		}

		if (polarSubscriptionId) {
			updateData.polarSubscriptionId = polarSubscriptionId;
		}

		await ctx.db.patch(subscription._id, updateData);

		if (isFounder) {
			await setFounder(ctx, { userId: subscription.owner, isFounder: true });
		}

		if (credits > 0n) {
			await addSubscriptionCredits(ctx, {
				owner: subscription.owner,
				value: { symbol: 'USD', amount: credits },
				description: 'Subscription credits',
				subscriptionId: subscription._id,
			});
		}
	},
});

export const findOneByPaymentId = defineQuery({
	args: z.object({
		paymentId: z.string(),
	}),
	handler: async (ctx, { paymentId }) => {
		//
		return await ctx.db
			.query('subscriptions')
			.withIndex('by_paymentId', (q) => q.eq('paymentId', paymentId))
			.first();
	},
});

export const findOne = defineQuery({
	args: z.object({
		subscriptionId: zid('subscriptions'),
	}),
	handler: async (ctx, { subscriptionId }) => {
		//
		return await ctx.db.get(subscriptionId);
	},
});

export const findActive = defineQuery({
	args: z.object({
		owner: zid('users'),
	}),
	handler: async (ctx, { owner }): Promise<Doc<'subscriptions'>[]> => {
		//
		const now = Date.now();

		return await ctx.db
			.query('subscriptions')
			.withIndex('by_owner_status', (q) => q.eq('owner', owner).eq('status', 'active'))
			.collect()
			.then((subs) => subs.filter((s) => (s.validUntil ?? 0) > now));
	},
});

export const findByPolarSubscriptionId = defineQuery({
	args: z.object({
		polarSubscriptionId: z.string(),
	}),
	handler: async (ctx, { polarSubscriptionId }) => {
		//
		return await ctx.db
			.query('subscriptions')
			.withIndex('by_polarSubscriptionId', (q) => q.eq('polarSubscriptionId', polarSubscriptionId))
			.first();
	},
});

export const handleRevocation = defineMutation({
	args: z.object({
		polarSubscriptionId: z.string(),
	}),
	handler: async (ctx, { polarSubscriptionId }) => {
		//
		const subscription = await findByPolarSubscriptionId(ctx, { polarSubscriptionId });

		if (!subscription) {
			throw NotFound(`Subscription not found for revocation: ${polarSubscriptionId}`);
		}

		await ctx.db.patch(subscription._id, {
			status: 'revoked',
			validUntil: Date.now(), // Immediate revocation
		});

		console.debug('Subscription revoked immediately', {
			subscriptionId: subscription._id,
			polarSubscriptionId,
		});
	},
});

// export const handleRefund = async (
// 	ctx: MutationCtx, //
// 	args: {
// 		checkoutId: string;
// 		amount: number;
// 		description?: string;
// 	},
// ) => {
// 	//
// 	const { checkoutId, amount, description = 'Subscription refund' } = args;
// 	const subscription = await findOneByPaymentId(ctx, { paymentId: checkoutId });

// 	if (!subscription) {
// 		console.warn('Subscription not found for refund', { checkoutId });
// 		return;
// 	}

// 	// Add negative transaction for refund
// 	await ctx.runMutation(internal.transactions._addSubscriptionCredits, {
// 		owner: subscription.owner,
// 		value: { symbol: 'USD', amount: -BigInt(Math.round(amount * 100)) },
// 		description,
// 		subscriptionId: subscription._id,
// 	});

// 	// If subscription is still active and refund is significant, consider canceling
// 	const refundThreshold = 5; // $5 threshold
// 	if (subscription.status === 'active' && amount >= refundThreshold) {
// 		await ctx.db.patch(subscription._id, {
// 			status: 'canceled',
// 			validUntil: Date.now(),
// 		});
// 	}

// 	console.debug('Subscription refund processed', {
// 		subscriptionId: subscription._id,
// 		amount,
// 		description,
// 	});
// };
