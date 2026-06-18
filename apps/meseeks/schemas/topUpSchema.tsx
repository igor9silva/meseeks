import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';

export const tokenSchema = z.literal('energy');

export const topUpStatusSchema = z.enum([
	'waiting', //
	'confirmed',
	'failed',
	'discarded by user',
]);

export const topUpAmountSchema = z.bigint().min(1n).describe('Usable energy amount.');

export const topUpSchema = z
	.object({
		owner: zid('users'),
		author: authorSchema,
		amount: topUpAmountSchema,
		fee: z.bigint(),
		totalCharged: z.bigint(),
		status: topUpStatusSchema,
		paymentUrl: z.string().url().optional(),
		paymentId: z.string().optional(),
		provider: z.literal('polar'),
	})
	.describe('One-time energy deposit checkout state.');
