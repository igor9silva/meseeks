import { Webhook, WebhookVerificationError } from 'standardwebhooks';
import { internal } from 'convex/_generated/api';
import { ActionCtx, httpAction } from 'convex/_generated/server';
import { env } from 'schemas/envSchema';
import { orderPaidSchema, webhookEventSchema } from 'schemas/polarEventSchema';
import { asBigInt } from './money';

export const handlePolarWebhook = httpAction(async (ctx, request) => {
	//
	try {
		const body = await request.text();

		const headers: Record<string, string> = {};
		request.headers.forEach((value, key) => (headers[key] = value));

		validateEvent(body, headers, env.POLAR_WEBHOOK_SECRET);

		// TODO: Avoid logging the raw webhook body; log event metadata instead to reduce customer data exposure.
		console.debug('Polar webhook received', body);

		// TODO: Return 400 for malformed JSON instead of letting JSON.parse fall through as a generic 500.
		const json = JSON.parse(body);
		if (typeof json.type !== 'string') {
			console.error('Invalid webhook payload', json);
			throw new PayloadParseError('Invalid webhook payload');
		}

		// TODO: Make webhook persistence and side effects idempotent before relying on Polar retries.

		// persist all events
		await ctx.runMutation(internal.topUps._persistPolarEvent, { polarEvent: json });

		// will throw if invalid schema
		const parsed = webhookEventSchema.safeParse(json);

		if (!parsed.success) {
			console.debug('Ignored webhook event', json, parsed.error);
			return new Response(null, { status: 200 });
		}

		const event = parsed.data;

		switch (event.type) {
			//
			case 'order.paid':
				//
				const paidPayload = orderPaidSchema.parse(json);

				const billingReason = paidPayload.data.billing_reason;
				const isRenewal = billingReason === 'subscription_cycle';
				const isNewSubscription = billingReason === 'subscription_create';

				console.debug('Processing order.paid', {
					productId: paidPayload.data.product_id,
					billingReason,
					isRenewal,
					isNewSubscription,
					subscriptionId: paidPayload.data.subscription_id,
				});

				// TODO: Use product-specific schemas so subscription products require subscription_id and top-ups do not.
				switch (paidPayload.data.product_id) {
					//
					case env.POLAR_TOP_UP_ID:
						await finishTopUp({
							ctx,
							checkoutId: paidPayload.data.checkout_id,
							amount: paidPayload.data.net_amount / 100, // cents to dollars
						});
						break;

					case env.POLAR_SUBSCRIPTION_ID:
						await activateSubscription({
							ctx,
							// TODO: For renewal events, look up the existing subscription by subscription_id instead of checkout_id.
							checkoutId: paidPayload.data.checkout_id,
							amount: paidPayload.data.net_amount / 100, // cents to dollars
							// TODO: Use Polar current_period_end instead of local 30-day month math.
							durationMonths: 1,
							isFounder: false,
							isRenewal,
							polarSubscriptionId: paidPayload.data.subscription_id,
						});
						break;

					case env.POLAR_FOUNDER_PACK_ID:
						await activateSubscription({
							ctx,
							// TODO: For renewal events, look up the existing subscription by subscription_id instead of checkout_id.
							checkoutId: paidPayload.data.checkout_id,
							amount: paidPayload.data.net_amount / 100, // cents to dollars
							// TODO: Use Polar current_period_end instead of local 30-day month math.
							durationMonths: 24,
							isFounder: true,
							isRenewal,
							polarSubscriptionId: paidPayload.data.subscription_id,
						});
						break;

					default:
						console.debug('Unknown product payment', paidPayload.data.product_id);
				}
				break;

			case 'order.refunded':
				// TODO: implement automatic refund handling
				console.error('Not implemented: order.refunded', event);
				break;

			// case 'subscription.canceled':
			// just let it expire naturally
			// this will work but subscriptions will appear "active" but won't be treated as valid because of `validUntil`
			// TODO: schedule a mutation to set 'canceled'

			case 'subscription.revoked':
				await handleImmediateRevocation({
					ctx,
					polarSubscriptionId: event.data.id,
				});
				break;
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

async function finishTopUp({
	ctx, //
	checkoutId,
	amount,
}: {
	ctx: ActionCtx;
	checkoutId: string;
	amount: number;
}) {
	return await ctx.runMutation(internal.topUps._finish, {
		checkoutId,
		amount: asBigInt({ dollars: amount }),
	});
}

async function activateSubscription(params: {
	ctx: ActionCtx;
	checkoutId: string;
	amount: number;
	durationMonths: number;
	isFounder: boolean;
	isRenewal: boolean;
	polarSubscriptionId?: string;
}) {
	const { ctx, checkoutId, amount, durationMonths, isFounder, isRenewal, polarSubscriptionId } = params;

	console.debug('Activating subscription', {
		checkoutId,
		amount,
		durationMonths,
		isFounder,
		isRenewal,
		polarSubscriptionId,
	});

	return await ctx.runMutation(internal.subscriptions._activate, {
		checkoutId,
		months: durationMonths,
		credits: asBigInt({ dollars: amount }),
		isFounder,
		isRenewal,
		polarSubscriptionId,
	});
}

async function handleImmediateRevocation({
	ctx, //
	polarSubscriptionId,
}: {
	ctx: ActionCtx;
	polarSubscriptionId: string;
}) {
	console.debug('Processing subscription revocation', { polarSubscriptionId });

	return await ctx.runMutation(internal.subscriptions._handleRevocation, {
		polarSubscriptionId,
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
