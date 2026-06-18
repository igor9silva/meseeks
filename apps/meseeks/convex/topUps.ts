import { Polar } from '@polar-sh/sdk';
import { zid } from 'convex-helpers/server/zod3';
import type { Id } from './_generated/dataModel';
import { action, internalMutation, mutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { asNumber } from 'lib/money';
import { env } from 'schemas/envSchema';
import { topUpAmountSchema } from 'schemas/topUpSchema';
import { api, internal } from './_generated/api';
import { addTopUp, findTopUp, findTopUpsByStatus, findWaitingTopUps, finishTopUp } from './topUps.private';
import { getCurrentUser } from './users.private';

const FEE_RATE_PERCENT = 2n;

// called by startTopUp action after checkout creation to persist a waiting top-up record
export const _add = internalMutation({
	args: addTopUp.args.shape,
	handler: addTopUp,
});

// called from lib/polar.ts on order.paid webhook to mark top-up confirmed and credit energy
export const _finish = internalMutation({
	args: finishTopUp.args.shape,
	handler: finishTopUp,
});

export const startTopUp = action({
	args: {
		amount: topUpAmountSchema,
	},
	handler: async (ctx, { amount }): Promise<Id<'top_ups'>> => {
		//
		const currentUser = await ctx.runQuery(api.users.current, {});
		const fee = (amount * FEE_RATE_PERCENT) / 100n;
		const totalCharged = amount + fee;

		console.debug(`Starting top up at Polar '${env.POLAR_SERVER}' environment.`);

		const polar = new Polar({
			server: env.POLAR_SERVER,
			accessToken: env.POLAR_ACCESS_TOKEN,
		});

		const checkout = await polar.checkouts.create({
			amount: asNumber({ bigInt: totalCharged }) * 100,
			allowDiscountCodes: false,
			successUrl: `${env.SITE_URL}/polar/topped?checkout_id={CHECKOUT_ID}`,
			customerName: currentUser.name,
			customerExternalId: currentUser._id,
			customerEmail: currentUser.email,
			products: [env.POLAR_TOP_UP_ID],
		});

		return await ctx.runMutation(internal.topUps._add, {
			author: currentUser._id,
			owner: currentUser._id,
			amount,
			fee,
			totalCharged,
			paymentUrl: checkout.url,
			paymentId: checkout.id,
		});
	},
});

export const discard = mutation({
	args: {
		topUpId: zid('top_ups'),
	},
	handler: async (ctx, { topUpId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const topUp = await ctx.db.get(topUpId);

		if (!topUp) throw NotFound();
		if (topUp.owner !== currentUser._id) throw NotFound();
		if (topUp.status !== 'waiting') throw new Error('Top-up cannot be discarded anymore');

		return await ctx.db.patch(topUpId, { status: 'discarded by user' });
	},
});

export const findOne = query({
	args: {
		topUpId: zid('top_ups'),
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
			findTopUpsByStatus(ctx, { owner: currentUser._id, status: 'confirmed' }),
			findTopUpsByStatus(ctx, { owner: currentUser._id, status: 'failed' }),
		]);

		return confirmed
			.concat(failed) //
			.sort((a, b) => b._creationTime - a._creationTime);
	},
});
