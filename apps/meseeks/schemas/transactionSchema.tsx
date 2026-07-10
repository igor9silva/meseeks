import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { tokenSchema } from './topUpSchema';

export const valueSchema = z.object({
	symbol: tokenSchema,
	amount: z.bigint(),
});

const transactionBaseSchema = z.object({
	owner: zid('users'),
	value: valueSchema,
	description: z.string().min(1),
	createdAt: z.number(),
});

export const freeCreditsTransactionSchema = transactionBaseSchema.extend({
	kind: z.literal('free credits'),
});

export const topUpTransactionSchema = transactionBaseSchema.extend({
	kind: z.literal('top up'),
	topUpId: zid('topUps'),
});

export const actionSettlementTransactionSchema = transactionBaseSchema.extend({
	kind: z.literal('action settlement'),
	file: zid('files'),
	action: zid('actions'),
});

export const subscriptionTransactionSchema = transactionBaseSchema.extend({
	kind: z.literal('subscription'),
	subscriptionId: zid('subscriptions'),
});

export const newTransactionSchema = z.union([
	freeCreditsTransactionSchema.omit({ createdAt: true }),
	topUpTransactionSchema.omit({ createdAt: true }),
	actionSettlementTransactionSchema.omit({ createdAt: true }),
	subscriptionTransactionSchema.omit({ createdAt: true }),
]);

export const transactionSchema = z
	.union([
		freeCreditsTransactionSchema, //
		topUpTransactionSchema,
		actionSettlementTransactionSchema,
		subscriptionTransactionSchema,
	])
	.describe('The account wallet ledger. Settlement creates transactions; reservations do not charge the wallet.');
