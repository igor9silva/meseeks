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
		await ctx.runMutation(internal.polarEvents._recordPolarEvent, {
			event: {
				type: json.type,
				eventId: json.data?.id,
				data: json.data,
			},
		});

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

				console.debug('Processing order.paid', {
					productId: paidPayload.data.product_id,
					billingReason,
				});

				switch (paidPayload.data.product_id) {
					//
					case env.POLAR_TOP_UP_ID:
						await finishTopUp({
							ctx,
							checkoutId: paidPayload.data.checkout_id,
							amount: paidPayload.data.net_amount / 100, // cents to dollars
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
