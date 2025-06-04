import { Polar } from '@polar-sh/sdk';
import { z } from 'zod';
import { api, internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { action, query } from '../lib';
import { env } from '../schemas/envSchema';
import { current as getCurrentUser } from '../users/public';
import { _findActive } from './private';

export const startSubscription = action({
	args: {
		product: z.enum(['pro', 'founder']),
	},
	handler: async (
		ctx,
		{ product },
	): Promise<{
		id: Id<'subscriptions'>;
		paymentUrl: string;
	}> => {
		//
		const currentUser = await ctx.runQuery(api.users.public.currentIfPro, {});

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

		const subId = await ctx.runMutation(internal.subscriptions.private._add, {
			owner: currentUser._id,
			paymentUrl: checkout.url,
			paymentId: checkout.id,
		});

		return { id: subId, paymentUrl: checkout.url };
	},
});

export const findActive = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await _findActive(ctx, { owner: currentUser._id });
	},
});
