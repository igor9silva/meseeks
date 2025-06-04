import { Polar } from '@polar-sh/sdk';
import { zid } from 'convex-helpers/server/zod';
import { Webhook, WebhookVerificationError } from 'standardwebhooks';
import { z } from 'zod';
import { api, internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { httpAction } from '../_generated/server';
import { action, mutation, query } from '../lib';
import { env } from '../schemas/envSchema';
import { blockchainSchema, tokenSchema, topUpAmountSchema } from '../schemas/topUpSchema';
import { current as getCurrentUser } from '../users/public';
import { asBigInt, asDollars, asNumber } from '../utils/money';
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
		const currentUser = await ctx.runQuery(api.users.public.current, {});

		const activeSubs = await ctx.runQuery(internal.subscriptions.private._findActive, {
			owner: currentUser._id,
		});

		if (activeSubs.length === 0) {
			throw new Error('Pro subscription required to top up');
		}

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

export const polarWebhook = httpAction(async (ctx, request) => {
	//
	try {
		const body = await request.text();

		const headers: Record<string, string> = {};
		request.headers.forEach((value, key) => (headers[key] = value));

		validateEvent(body, headers, env.POLAR_WEBHOOK_SECRET);
		console.debug('Polar webhook received', body);

		const json = JSON.parse(body);
		if (typeof json.type !== 'string') {
			console.error('Invalid webhook payload', json);
			return new Response(null, { status: 400 });
		}

		// persist all events
		await ctx.runMutation(internal.topUps.private._persistPolarEvent, { polarEvent: json });

		switch (json.type) {
			//
			case 'order.paid':
				//
				const paidPayload = webhookPayloadSchema.parse(json);

				switch (paidPayload.data.product_id) {
					//
					case env.POLAR_TOP_UP_ID:
						await ctx.runMutation(internal.topUps.private._finish, {
							checkoutId: paidPayload.data.checkout_id,
							amount: asBigInt({ dollars: paidPayload.data.net_amount / 100 }),
						});
						break;

					case env.POLAR_SUBSCRIPTION_ID:
						await ctx.runMutation(internal.subscriptions.private._activate, {
							checkoutId: paidPayload.data.checkout_id,
							months: 1,
							credits: asBigInt({ dollars: 10 }),
						});
						break;

					case env.POLAR_FOUNDER_PACK_ID:
						await ctx.runMutation(internal.subscriptions.private._activate, {
							checkoutId: paidPayload.data.checkout_id,
							months: 24,
							credits: asBigInt({ dollars: 200 }),
							isFounder: true,
						});
						break;

					default:
						console.debug('Unknown product payment', paidPayload.data.product_id);
				}
				break;
			case 'order.refunded':
				const refundedPayload = webhookPayloadSchema.parse(json);
				console.warn('Polar order refunded', refundedPayload);
				break;

			default:
				console.debug(`Unhandled Polar '${json.type}' event received.`, body);
		}

		return new Response(null, { status: 200 });
		//
	} catch (error) {
		//
		if (error instanceof WebhookVerificationError) {
			console.error('Polar webhook verification error', error);
			return new Response(null, { status: 403 });
		}

		if (error instanceof PayloadParseError) {
			console.error('Polar webhook payload parse error', error);
			return new Response(null, { status: 400 });
		}

		console.error('Polar webhook error', error);
		return new Response(null, { status: 500 });
	}
});

class PayloadParseError extends Error {
	constructor(message: string) {
		super(message);
		this.message = message;
	}
}

const validateEvent = (
	body: string, //
	headers: Record<string, string>,
	secret: string,
) => {
	//
	const utf8 = new TextEncoder().encode(secret);
	const base64Secret = btoa(String.fromCharCode(...utf8));

	const webhook = new Webhook(base64Secret);
	return webhook.verify(body, headers);
};

const webhookPayloadSchema = z.object({
	type: z.enum([
		'order.paid', //
		'order.refunded',
	]),
	data: z.object({
		id: z.string(),
		net_amount: z.number().describe('Amount in cents, after discounts but before taxes.'),
		status: z.enum([
			'pending', //
			'paid',
			'refunded',
			'partially_refunded',
		]),
		paid: z.boolean(),
		billing_reason: z.enum([
			'purchase', //
			'subscription_create',
			'subscription_cycle',
			'subscription_update',
		]),
		product_id: z.string(),
		checkout_id: z.string(),
		customer: z.object({
			external_id: z.string(),
		}),
	}),
});
