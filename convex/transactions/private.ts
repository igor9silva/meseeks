import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internalMutation } from '../lib';
import { valueSchema } from '../schemas/transactionSchema';
import { _adjustBalance } from '../users/private';
import type { MutationCtx } from '../_generated/server';
import type { transactionSchema } from '../schemas/transactionSchema';

export const _addFreeCredits = internalMutation({
	args: {
		value: valueSchema,
		owner: zid('users'),
		description: z.string(),
	},
	handler: async (ctx, args) => _addTransaction(ctx, { kind: 'free credits', ...args }),
});

export const _addTopUp = internalMutation({
	args: {
		value: valueSchema,
		topUpId: zid('topUps'),
		owner: zid('users'),
		description: z.string().optional(),
	},
	handler: async (ctx, args) => _addTransaction(ctx, { kind: 'top up', ...args }),
});

export const _addFundTask = internalMutation({
	args: {
		value: valueSchema,
		taskId: zid('tasks'),
		owner: zid('users'),
		description: z.string().optional(),
	},
	handler: async (ctx, args) => _addTransaction(ctx, { kind: 'fund task', ...args }),
});

export const _addRefundTask = internalMutation({
	args: {
		value: valueSchema,
		taskId: zid('tasks'),
		owner: zid('users'),
		description: z.string().optional(),
	},
	handler: async (ctx, args) => _addTransaction(ctx, { kind: 'refund from task', ...args }),
});

export const _addSubscriptionCredits = internalMutation({
	args: {
		value: valueSchema,
		subscriptionId: zid('subscriptions'),
		owner: zid('users'),
		description: z.string().optional(),
	},
	handler: async (ctx, args) => _addTransaction(ctx, { kind: 'subscription', ...args }),
});

async function _addTransaction(ctx: MutationCtx, args: z.infer<typeof transactionSchema>) {
	//
	if (args.value.symbol !== 'USD') throw new Error('Only USD is supported for now');

	const transactionId = await ctx.db.insert('transactions', args);

	await _adjustBalance(ctx, {
		userId: args.owner,
		value: args.value,
	});

	return transactionId;
}
