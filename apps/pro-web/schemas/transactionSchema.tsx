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

export const actionReservationTransactionSchema = z.object({
	kind: z.literal('reserve action'),
	value: valueSchema,
	taskId: zid('tasks'),
	actionId: zid('actions'),
	owner: zid('users'),
	description: z.string().optional(),
});

export const actionSettlementTransactionSchema = z.object({
	kind: z.literal('settle action'),
	value: valueSchema,
	taskId: zid('tasks'),
	actionId: zid('actions'),
	owner: zid('users'),
	description: z.string().optional(),
});

export const subscriptionTransactionSchema = z.object({
	kind: z.literal('subscription'),
	value: valueSchema,
	subscriptionId: zid('subscriptions'),
	owner: zid('users'),
	description: z.string().optional(),
});

export const transactionSchema = z
	.union([
		freeCreditsTransactionSchema, //
		topUpTransactionSchema,
		actionReservationTransactionSchema,
		actionSettlementTransactionSchema,
		subscriptionTransactionSchema,
	])
	.describe(
		'A financial transaction. Top ups, pay outs and task/action execution costs.', //
	);
