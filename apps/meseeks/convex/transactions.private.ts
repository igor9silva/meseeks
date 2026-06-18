import { z } from 'zod/v3';
import { defineMutation } from 'lib/convex';
import { transactionSchema } from 'schemas/transactionSchema';
import { adjustUserBalance } from './users.private';

export const addFreeCredits = defineMutation({
	args: z.object({
		owner: transactionSchema.shape.owner,
		value: transactionSchema.shape.value,
		description: z.string(),
	}),
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'free energy', ...args }),
});

export const addTopUpTransaction = defineMutation({
	args: z.object({
		owner: transactionSchema.shape.owner,
		value: transactionSchema.shape.value,
		topUp: transactionSchema.shape.topUp.unwrap(),
		description: transactionSchema.shape.description,
	}),
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'top up', ...args }),
});

export const addActionCostTransaction = defineMutation({
	args: z.object({
		owner: transactionSchema.shape.owner,
		value: transactionSchema.shape.value,
		action: transactionSchema.shape.action.unwrap(),
		description: transactionSchema.shape.description,
	}),
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'action cost', ...args }),
});

export const addStorageCostTransaction = defineMutation({
	args: z.object({
		owner: transactionSchema.shape.owner,
		value: transactionSchema.shape.value,
		file: transactionSchema.shape.file.unwrap(),
		description: transactionSchema.shape.description,
	}),
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'storage cost', ...args }),
});

export const addRefundTransaction = defineMutation({
	args: z.object({
		owner: transactionSchema.shape.owner,
		value: transactionSchema.shape.value,
		action: transactionSchema.shape.action,
		topUp: transactionSchema.shape.topUp,
		description: transactionSchema.shape.description,
	}),
	handler: async (ctx, args) => addTransaction(ctx, { kind: 'refund', ...args }),
});

const addTransaction = defineMutation({
	args: transactionSchema,
	handler: async (ctx, transaction) => {
		//
		const transactionId = await ctx.db.insert('transactions', transaction);

		await adjustUserBalance(ctx, {
			userId: transaction.owner,
			amount: transaction.value,
		});

		return transactionId;
	},
});
