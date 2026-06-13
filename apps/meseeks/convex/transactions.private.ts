import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation } from 'lib/convex';
import { transactionSchema, valueSchema } from 'schemas/transactionSchema';
import { adjustUserBalance } from './users.private';

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
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'top up', ...args }),
});

// helper, not exported
const addTransaction = defineMutation({
	args: transactionSchema,
	handler: async (ctx, transaction) => {
		//
		const transactionId = await ctx.db.insert('transactions', transaction);

		await adjustUserBalance(ctx, {
			userId: transaction.owner,
			value: transaction.value,
		});

		return transactionId;
	},
});
