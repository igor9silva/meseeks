import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { tokenSchema } from './topUpSchema';

export const valueSchema = z.object({
	symbol: tokenSchema,
	amount: z.bigint(),
});

export const freeCreditsTransactionSchema = z.object({
	kind: z.literal('free credits'),
	value: valueSchema,
	owner: zid('users'),
	description: z.string().optional(),
});

export const topUpTransactionSchema = z.object({
	kind: z.literal('top up'),
	value: valueSchema,
	topUpId: zid('topUps'),
	owner: zid('users'),
	description: z.string().optional(),
});

export const transactionSchema = z
	.union([
		freeCreditsTransactionSchema, //
		topUpTransactionSchema,
	])
	.describe(
		'A wallet transaction for credits granted or added by top-up.', //
	);
