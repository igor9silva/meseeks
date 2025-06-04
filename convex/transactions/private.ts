import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internalMutation } from '../lib';
import { valueSchema } from '../schemas/transactionSchema';
import { _adjustBalance } from '../users/private';

export const _addFreeCredits = internalMutation({
	args: {
		value: valueSchema,
		owner: zid('users'),
		description: z.string().optional(),
	},
	handler: async (ctx, args) => {
		//
		const transactionId = await ctx.db.insert('transactions', {
			kind: 'free credits',
			...args,
		});

		if (args.value.symbol !== 'USD') throw new Error('Only USD is supported for now');

		await _adjustBalance(ctx, {
			userId: args.owner,
			value: {
				symbol: args.value.symbol,
				amount: args.value.amount,
			},
		});

		return transactionId;
	},
});

export const _addTopUp = internalMutation({
	args: {
		value: valueSchema,
		topUpId: zid('topUps'),
		owner: zid('users'),
		description: z.string().optional(),
	},
	handler: async (ctx, args) => {
		//
		const transactionId = await ctx.db.insert('transactions', {
			kind: 'top up',
			...args,
		});

		if (args.value.symbol !== 'USD') throw new Error('Only USD is supported for now');

		await _adjustBalance(ctx, {
			userId: args.owner,
			value: {
				symbol: args.value.symbol,
				amount: args.value.amount,
			},
		});

		return transactionId;
	},
});

export const _addFundTask = internalMutation({
	args: {
		value: valueSchema,
		taskId: zid('tasks'),
		owner: zid('users'),
		description: z.string().optional(),
	},
	handler: async (ctx, args) => {
		//
		const transactionId = await ctx.db.insert('transactions', {
			kind: 'fund task',
			...args,
		});

		if (args.value.symbol !== 'USD') throw new Error('Only USD is supported for now');

		console.debug('addFundTask transaction', args.taskId, args.value.amount);
		await _adjustBalance(ctx, {
			userId: args.owner,
			value: {
				symbol: args.value.symbol,
				amount: args.value.amount,
			},
		});

		return transactionId;
	},
});

export const _addRefundTask = internalMutation({
	args: {
		value: valueSchema,
		taskId: zid('tasks'),
		owner: zid('users'),
		description: z.string().optional(),
	},
	handler: async (ctx, args) => {
		//
		const transactionId = await ctx.db.insert('transactions', {
			kind: 'refund from task',
			...args,
		});

		if (args.value.symbol !== 'USD') throw new Error('Only USD is supported for now');

		await _adjustBalance(ctx, {
			userId: args.owner,
			value: {
				symbol: args.value.symbol,
				amount: args.value.amount,
			},
		});

		return transactionId;
	},
});

export const _addSubscriptionCredits = internalMutation({
	args: {
		value: valueSchema,
		subscriptionId: zid('subscriptions'),
		owner: zid('users'),
		description: z.string().optional(),
	},
	handler: async (ctx, args) => {
		const transactionId = await ctx.db.insert('transactions', {
			kind: 'subscription',
			...args,
		});

		if (args.value.symbol !== 'USD') throw new Error('Only USD is supported for now');

		await _adjustBalance(ctx, {
			userId: args.owner,
			value: {
				symbol: args.value.symbol,
				amount: args.value.amount,
			},
		});

		return transactionId;
	},
});
