import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';

export const polarEventReceiptSchema = z
	.object({
		owner: zid('users').optional(),
		action: zid('actions').optional(),
		type: z.string().min(1),
		eventId: z.string().optional(),
		data: z.record(z.unknown()).describe('Polar payload after secret stripping.'),
		receivedAt: z.number(),
	})
	.describe('Polar webhook receipt row.');

export const polarEventSchema = z.object({
	type: z.string(),
	timestamp: z.string().optional(),
	data: z
		.object({
			id: z.string().optional(),
		})
		.catchall(z.unknown()),
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
