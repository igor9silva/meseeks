import { Polar } from '@polar-sh/sdk';
import { z } from 'zod';
import { action, internalMutation, internalQuery, query } from 'lib/functions';
import { env } from 'schemas/envSchema';
import { activate, add, findActive as findActiveSubscriptions, handleRevocation } from './subscriptions.private';
import { getCurrentUser, isProSubscriber } from './users.private';
import { internal } from './_generated/api';

// called by startSubscription action after polar checkout creation to persist the pending subscription
export const _add = internalMutation({
	args: add.args.shape,
	handler: add,
});

// called from lib/polar.ts when order.paid arrives to activate/renew the subscription
export const _activate = internalMutation({
	args: activate.args.shape,
	handler: activate,
});

// called from lib/polar.ts on subscription.revoked webhook to revoke access immediately
export const _handleRevocation = internalMutation({
	args: handleRevocation.args.shape,
	handler: handleRevocation,
});

export const _getStartSubscriptionContext = internalQuery({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const isCurrentUserProSubscriber = await isProSubscriber(ctx, { owner: currentUser._id });

		return { currentUser, isProSubscriber: isCurrentUserProSubscriber };
	},
});

export const startSubscription = action({
	args: {
		product: z.enum(['pro', 'founder']),
	},
	handler: async (ctx, { product }): Promise<{ paymentUrl: string }> => {
		//
		const { currentUser, isProSubscriber } = await ctx.runQuery(
			internal.subscriptions._getStartSubscriptionContext,
			{},
		);

		if (isProSubscriber) throw new Error('User is already Pro.');

		const polar = new Polar({
			server: env.POLAR_SERVER,
			accessToken: env.POLAR_ACCESS_TOKEN,
		});

		const productId = product === 'founder' ? env.POLAR_FOUNDER_PACK_ID : env.POLAR_SUBSCRIPTION_ID;

		const checkout = await polar.checkouts.create({
			allowDiscountCodes: false,
			successUrl: `${env.SITE_URL}/polar/subscribed?checkout_id={CHECKOUT_ID}`,
			customerName: currentUser.name,
			customerExternalId: currentUser._id,
			customerEmail: currentUser.email,
			products: [productId],
		});

		await ctx.runMutation(internal.subscriptions._add, {
			owner: currentUser._id,
			paymentUrl: checkout.url,
			paymentId: checkout.id,
		});

		return { paymentUrl: checkout.url };
	},
});

export const findActive = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await findActiveSubscriptions(ctx, { owner: currentUser._id });
	},
});
