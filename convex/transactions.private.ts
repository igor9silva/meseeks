import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { defineMutation } from './lib';
import { transactionSchema, valueSchema } from './schemas/transactionSchema';
import { adjustBalance } from './users.private';
import type { MutationCtx } from './_generated/server';

export const addFreeCredits = defineMutation({
	args: z.object({
		value: valueSchema,
		owner: zid('users'),
		description: z.string(),
	}),
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'free credits', ...args }),
});

export const addTopUp = defineMutation({
	args: z.object({
		value: valueSchema,
		topUpId: zid('topUps'),
		owner: zid('users'),
		description: z.string().optional(),
	}),
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'top up', ...args }),
});

export const addFundTask = defineMutation({
	args: z.object({
		value: valueSchema,
		taskId: zid('tasks'),
		owner: zid('users'),
		description: z.string().optional(),
	}),
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'fund task', ...args }),
});

export const addRefundTask = defineMutation({
	args: z.object({
		value: valueSchema,
		taskId: zid('tasks'),
		owner: zid('users'),
		description: z.string().optional(),
	}),
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'refund from task', ...args }),
});

export const addSubscriptionCredits = defineMutation({
	args: z.object({
		value: valueSchema,
		subscriptionId: zid('subscriptions'),
		owner: zid('users'),
		description: z.string().optional(),
	}),
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'subscription', ...args }),
});

async function addTransaction(ctx: MutationCtx, args: z.infer<typeof transactionSchema>) {
	//
	if (args.value.symbol !== 'USD') throw new Error('Only USD is supported for now');

	const transactionId = await ctx.db.insert('transactions', args);

	await adjustBalance(ctx, {
		userId: args.owner,
		value: args.value,
	});

	return transactionId;
}
