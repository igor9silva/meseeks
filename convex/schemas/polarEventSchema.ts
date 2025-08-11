import { z } from 'zod';

export const polarEventSchema = z.object({
	type: z.string(),
	data: z.record(z.any()),
});

export const orderDataSchema = z.object({
	id: z.string(),
	net_amount: z.number().describe('Amount in cents, after discounts but before taxes.'),
	status: z.enum([
		'pending', //
		'paid',
		'refunded',
		'partially_refunded',
	]),
	paid: z.boolean(),
	billing_reason: z
		.enum([
			'purchase', //
			'subscription_create',
			'subscription_cycle',
			'subscription_update',
		])
		.optional(),
	product_id: z.string(),
	checkout_id: z.string(),
	subscription_id: z.string().optional(),
	customer: z.object({
		external_id: z.string(),
	}),
});

export const subscriptionDataSchema = z.object({
	id: z.string(),
	status: z.enum([
		'incomplete', //
		'active',
		'past_due',
		'canceled',
		'unpaid',
		'incomplete_expired',
		'trialing',
	]),
	customer: z.object({
		external_id: z.string(),
	}),
	product_id: z.string(),
	cancel_at_period_end: z.boolean(),
	current_period_end: z.string(),
	ended_at: z.string().optional().nullable(),
});

export const orderPaidSchema = z.object({
	type: z.literal('order.paid'),
	data: orderDataSchema,
});

export const orderRefundedSchema = z.object({
	type: z.literal('order.refunded'),
	data: orderDataSchema,
});

export const subscriptionRevokedSchema = z.object({
	type: z.literal('subscription.revoked'),
	data: subscriptionDataSchema,
});

export const webhookEventSchema = z.discriminatedUnion('type', [
	orderPaidSchema,
	orderRefundedSchema,
	subscriptionRevokedSchema,
]);
