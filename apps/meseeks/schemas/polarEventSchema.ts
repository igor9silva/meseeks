import { z } from 'zod/v3';

export const polarEventSchema = z.object({
	type: z.string(),
	timestamp: z.string().optional(),
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
		])
		.optional(),
	product_id: z.string(),
	checkout_id: z.string(),
	customer: z.object({
		external_id: z.string(),
	}),
});

export const orderPaidSchema = z.object({
	type: z.literal('order.paid'),
	data: orderDataSchema,
});

export const orderRefundedSchema = z.object({
	type: z.literal('order.refunded'),
	data: orderDataSchema,
});

export const webhookEventSchema = z.discriminatedUnion('type', [orderPaidSchema, orderRefundedSchema]);
