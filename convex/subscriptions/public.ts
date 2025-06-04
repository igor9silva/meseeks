import { Polar } from '@polar-sh/sdk';
import { api, internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { action, query } from '../lib';
import { env } from '../schemas/envSchema';
import { subscriptionPlanSchema } from '../schemas/subscriptionSchema';
import { current as getCurrentUser } from '../users/public';
import { _findActive } from './private';

export const startSubscription = action({
	args: {
		plan: subscriptionPlanSchema,
	},
	handler: async (ctx, { plan }): Promise<Id<'subscriptions'>> => {
		//
		const currentUser = await ctx.runQuery(api.users.public.current, {});

		const polar = new Polar({
			server: env.POLAR_SERVER,
			accessToken: env.POLAR_ACCESS_TOKEN,
		});

		const productId = plan === 'founder' ? env.POLAR_FOUNDER_PACK_ID : env.POLAR_SUBSCRIPTION_ID;

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

		return subId;
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
