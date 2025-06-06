import { Polar } from '@polar-sh/sdk';
import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { api, internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { action, mutation, query } from '../lib';
import { env } from '../schemas/envSchema';
import { blockchainSchema, tokenSchema, topUpAmountSchema } from '../schemas/topUpSchema';
import { current as getCurrentUser } from '../users/public';
import { asDollars, asNumber } from '../utils/money';
import { _findAllByStatus, _findAllWaiting, _findOne } from './private';

export const startTopUp = action({
	args: {
		chain: blockchainSchema,
		symbol: tokenSchema,
		amount: topUpAmountSchema,
		description: z.string().optional(),
	},
	handler: async (ctx, { chain, symbol, amount, description }): Promise<Id<'topUps'>> => {
		//
		const currentUser = await ctx.runQuery(api.users.public.currentIfPro, {});

		console.debug(`Starting top up at Polar '${env.POLAR_SERVER}' environment.`);

		const polar = new Polar({
			server: env.POLAR_SERVER,
			accessToken: env.POLAR_ACCESS_TOKEN,
		});

		const checkout = await polar.checkouts.create({
			amount: asNumber({ bigInt: amount }) * 100, // Polar requires USD cents ¢
			allowDiscountCodes: false,
			successUrl: `${env.SITE_URL}/polar/topped?checkout_id={CHECKOUT_ID}`,
			customerName: currentUser.name,
			customerExternalId: currentUser._id,
			customerEmail: currentUser.email,
			products: [env.POLAR_TOP_UP_ID],
		});

		const topUpId = await ctx.runMutation(internal.topUps.private._add, {
			author: currentUser._id,
			owner: currentUser._id,
			to: env.PAYMENT_ETH_ADDRESS_BASE_CHAIN,
			description:
				description ||
				`Add ${asDollars({ bigInt: amount })} US Dollar-equivalent credits to your account balance.`,
			chain,
			symbol,
			amount,
			paymentUrl: checkout.url,
			paymentId: checkout.id,
		});

		return topUpId;
	},
});

export const discard = mutation({
	args: {
		topUpId: zid('topUps'),
	},
	handler: async (ctx, { topUpId }) => {
		//
		const topUp = await findOne(ctx, { topUpId });

		if (topUp.status !== 'waiting') throw new Error('TopUp cannot be discarded anymore');

		return await ctx.db.patch(topUpId, { status: 'discarded by user' });
	},
});

export const findOne = query({
	args: {
		topUpId: zid('topUps'),
	},
	handler: async (ctx, { topUpId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const topUp = await _findOne(ctx, { topUpId });

		if (!topUp) throw new Error('TopUp not found');
		if (topUp.owner !== currentUser._id) throw new Error('TopUp not found');

		return topUp;
	},
});

export const findAllWaiting = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await _findAllWaiting(ctx, { owner: currentUser._id });
	},
});

export const findAllHistory = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		const [confirmed, failed] = await Promise.all([
			_findAllByStatus(ctx, { owner: currentUser._id, status: 'confirmed' }),
			_findAllByStatus(ctx, { owner: currentUser._id, status: 'failed' }),
		]);

		return confirmed.concat(failed).sort((a, b) => b._creationTime - a._creationTime);
	},
});
