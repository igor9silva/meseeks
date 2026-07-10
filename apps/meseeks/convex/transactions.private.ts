import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { newTransactionSchema, valueSchema } from 'schemas/transactionSchema';

export const addFreeCredits = defineMutation({
	args: z.object({
		value: valueSchema,
		owner: zid('users'),
		description: z.string(),
	}),
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'free credits', ...args }),
});

export const addTopUpTransaction = defineMutation({
	args: z.object({
		value: valueSchema,
		topUpId: zid('topUps'),
		owner: zid('users'),
		description: z.string().optional(),
	}),
	handler: async (ctx, { topUpId, ...args }) =>
		addTransaction(ctx, {
			kind: 'top up',
			...args,
			topUpId,
			description: args.description ?? `Top up ${topUpId}`,
		}),
});

export const addSettlementTransaction = defineMutation({
	args: z.object({
		value: valueSchema,
		file: zid('files'),
		action: zid('actions'),
		owner: zid('users'),
		description: z.string(),
	}),
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'action settlement', ...args }),
});

export const addSubscriptionCreditsTransaction = defineMutation({
	args: z.object({
		value: valueSchema,
		subscriptionId: zid('subscriptions'),
		owner: zid('users'),
		description: z.string().optional(),
	}),
	handler: async (ctx, { subscriptionId, ...args }) =>
		addTransaction(ctx, {
			kind: 'subscription',
			...args,
			subscriptionId,
			description: args.description ?? `Subscription credits ${subscriptionId}`,
		}),
});

// helper, not exported
const addTransaction = defineMutation({
	args: newTransactionSchema,
	handler: async (ctx, args) => {
		//
		const transactionId = await ctx.db.insert('transactions', {
			...args,
			createdAt: Date.now(),
		});

		const user = await ctx.db.get(args.owner);
		if (!user) throw NotFound();
		if (args.value.symbol !== 'USD') throw new Error('Only USD is supported for now');

		await ctx.db.patch(args.owner, {
			balanceUSD: (user.balanceUSD ?? 0n) + args.value.amount,
		});

		return transactionId;
	},
});
