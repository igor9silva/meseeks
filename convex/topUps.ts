import { Polar } from '@polar-sh/sdk';
import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { Id } from './_generated/dataModel';
import { action, internalMutation, internalQuery, mutation, query } from 'lib/functions';
import { NotFound } from 'lib/errors';
import { asDollars, asNumber } from 'lib/money';
import { env } from 'schemas/envSchema';
import { blockchainSchema, tokenSchema, topUpAmountSchema } from 'schemas/topUpSchema';
import { internal } from './_generated/api';
import {
	add,
	findAllByStatus,
	findAllWaiting as findWaitingTopUps,
	findOne as findTopUp,
	finish,
	persistPolarEvent,
} from './topUps.private';
import { getCurrentUser, isProSubscriber } from './users.private';

// called by startTopUp action after checkout creation to persist a waiting top-up record
export const _add = internalMutation({
	args: add.args.shape,
	handler: add,
});

// called from lib/polar.ts on order.paid webhook to mark top-up confirmed and credit balance
export const _finish = internalMutation({
	args: finish.args.shape,
	handler: finish,
});

// called from lib/polar.ts to persist raw webhook events for audit/debug before branching logic
export const _persistPolarEvent = internalMutation({
	args: persistPolarEvent.args.shape,
	handler: persistPolarEvent,
});

export const _getStartTopUpContext = internalQuery({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const isCurrentUserProSubscriber = await isProSubscriber(ctx, { owner: currentUser._id });
		return { currentUser, isProSubscriber: isCurrentUserProSubscriber };
	},
});

export const startTopUp = action({
	args: {
		chain: blockchainSchema,
		symbol: tokenSchema,
		amount: topUpAmountSchema,
		description: z.string().optional(),
	},
	handler: async (ctx, { chain, symbol, amount, description }): Promise<Id<'topUps'>> => {
		//
		const { currentUser, isProSubscriber } = await ctx.runQuery(internal.topUps._getStartTopUpContext, {});
		if (!isProSubscriber) throw new Error('User is not Pro.');

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

		const topUpId = await ctx.runMutation(internal.topUps._add, {
			author: currentUser._id,
			owner: currentUser._id,
			to: env.PAYMENT_ETH_ADDRESS_BASE_CHAIN,
			description: description || `Add ${asDollars({ bigInt: amount })} energy to your account balance.`,
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
		const currentUser = await getCurrentUser(ctx, {});
		const topUp = await ctx.db.get(topUpId);

		if (!topUp) throw NotFound();
		if (topUp.owner !== currentUser._id) throw NotFound();

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
		const topUp = await findTopUp(ctx, { topUpId });

		if (!topUp) throw NotFound();
		if (topUp.owner !== currentUser._id) throw NotFound();

		return topUp;
	},
});

export const findAllWaiting = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await findWaitingTopUps(ctx, { owner: currentUser._id });
	},
});

export const findAllHistory = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		const [confirmed, failed] = await Promise.all([
			findAllByStatus(ctx, { owner: currentUser._id, status: 'confirmed' }),
			findAllByStatus(ctx, { owner: currentUser._id, status: 'failed' }),
		]);

		return confirmed
			.concat(failed) //
			.sort((a, b) => b._creationTime - a._creationTime);
	},
});
