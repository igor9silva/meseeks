import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internalMutation, internalQuery } from '../lib';
import { NotFound } from '../lib/errors';
import { authorSchema } from '../schemas/authorSchema';
import { polarEventSchema } from '../schemas/polarEventSchema';
import { blockchainSchema, tokenSchema, topUpAmountSchema, walletAddressSchema } from '../schemas/topUpSchema';
import { _addTopUp } from '../transactions/private';

export const _add = internalMutation({
	args: {
		owner: zid('users'),
		author: authorSchema,
		to: walletAddressSchema,
		description: z.string(),
		chain: blockchainSchema,
		symbol: tokenSchema,
		amount: topUpAmountSchema,
		paymentUrl: z.string().url(),
		paymentId: z.string(),
	},
	handler: async (ctx, { author, owner, to, description, chain, symbol, amount, paymentUrl, paymentId }) => {
		//
		const topUpId = await ctx.db.insert('topUps', {
			to,
			description,
			chain,
			symbol,
			amount,
			status: 'waiting',
			author,
			owner,
			paymentUrl,
			paymentId,
		});

		return topUpId;
	},
});

export const _finish = internalMutation({
	args: {
		checkoutId: z.string(),
		amount: z.bigint(),
	},
	handler: async (ctx, { checkoutId, amount }) => {
		//
		const topUp = await _findOneByPaymentId(ctx, { paymentId: checkoutId });
		if (!topUp) throw NotFound();

		if (topUp.status !== 'waiting') throw new Error('Top up is not waiting');

		await ctx.db.patch(topUp._id, { status: 'confirmed' });

		await _addTopUp(ctx, {
			topUpId: topUp._id,
			owner: topUp.owner,
			value: {
				symbol: topUp.symbol,
				amount,
			},
		});
	},
});

export const _persistPolarEvent = internalMutation({
	args: {
		polarEvent: polarEventSchema,
	},
	handler: async (ctx, { polarEvent }) => {
		//
		await ctx.db.insert('polarEvents', polarEvent);
	},
});

// TODO: add automatic timeout for waiting top ups

export const _findOneByPaymentId = internalQuery({
	args: {
		paymentId: z.string(),
	},
	handler: async (ctx, { paymentId }) => {
		return await ctx.db
			.query('topUps')
			.withIndex('by_paymentId', (q) => q.eq('paymentId', paymentId))
			.first();
	},
});

export const _findOne = internalQuery({
	args: {
		topUpId: zid('topUps'),
	},
	handler: async (ctx, { topUpId }) => {
		return await ctx.db.get(topUpId);
	},
});

export const _findAllWaiting = internalQuery({
	args: {
		owner: zid('users'),
	},
	handler: async (ctx, { owner }) => {
		return await ctx.db
			.query('topUps')
			.withIndex('by_status_owner', (q) =>
				q
					.eq('status', 'waiting') //
					.eq('owner', owner),
			)
			.collect();
	},
});

export const _findAllByStatus = internalQuery({
	args: {
		owner: zid('users'),
		status: z.enum([
			'confirmed', //
			'failed',
			'waiting',
			'discarded by user',
		]),
	},
	handler: async (ctx, { owner, status }) => {
		return await ctx.db
			.query('topUps')
			.withIndex('by_status_owner', (q) =>
				q
					.eq('status', status) //
					.eq('owner', owner),
			)
			.collect();
	},
});
