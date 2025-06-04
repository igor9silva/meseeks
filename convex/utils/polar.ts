import { Webhook, WebhookVerificationError } from 'standardwebhooks';
import { z } from 'zod';
import { internal } from '../_generated/api';
import { ActionCtx, httpAction } from '../_generated/server';
import { env } from '../schemas/envSchema';
import { asBigInt } from './money';

export const handlePolarWebhook = httpAction(async (ctx, request) => {
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
						await finishTopUp(
							ctx, //
							paidPayload.data.checkout_id,
							paidPayload.data.net_amount,
						);
						break;

					// TODO: look at .billing_reason to find out it it's a renewal
					case env.POLAR_SUBSCRIPTION_ID:
						await activateSubscription(
							ctx,
							paidPayload.data.checkout_id,
							10, // USD
							1, // months
						);
						break;

					case env.POLAR_FOUNDER_PACK_ID:
						await activateSubscription(
							ctx,
							paidPayload.data.checkout_id,
							200, // USD
							24, // months
							true, // isFounder
						);
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

async function finishTopUp(
	ctx: ActionCtx, //
	checkoutId: string,
	amount: number,
) {
	return await ctx.runMutation(internal.topUps.private._finish, {
		checkoutId,
		amount: asBigInt({ dollars: amount / 100 }),
	});
}

async function activateSubscription(
	ctx: ActionCtx, //
	checkoutId: string,
	credits: number,
	months: number,
	isFounder: boolean = false,
) {
	return await ctx.runMutation(internal.subscriptions.private._activate, {
		checkoutId,
		months,
		credits: asBigInt({ dollars: credits }),
		isFounder: isFounder,
	});
}

class PayloadParseError extends Error {
	//
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
