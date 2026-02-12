import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { authorSchema } from 'schemas/authorSchema';
import { polarEventSchema } from 'schemas/polarEventSchema';
import { blockchainSchema, tokenSchema, topUpAmountSchema, walletAddressSchema } from 'schemas/topUpSchema';
import { addTopUp } from './transactions.private';

const findByPaymentId = async (
	ctx: QueryCtx | MutationCtx,
	{
		paymentId,
	}: {
		paymentId: string;
	},
) => {
	return await ctx.db
		.query('topUps')
		.withIndex('by_paymentId', (q) => q.eq('paymentId', paymentId))
		.first();
};

export const add = defineMutation({
	args: z.object({
		owner: zid('users'),
		author: authorSchema,
		to: walletAddressSchema,
		description: z.string(),
		chain: blockchainSchema,
		symbol: tokenSchema,
		amount: topUpAmountSchema,
		paymentUrl: z.string().url(),
		paymentId: z.string(),
	}),
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

export const finish = defineMutation({
	args: z.object({
		checkoutId: z.string(),
		amount: z.bigint(),
	}),
	handler: async (ctx, { checkoutId, amount }) => {
		//
		const topUp = await findByPaymentId(ctx, { paymentId: checkoutId });
		if (!topUp) throw NotFound();

		if (topUp.status !== 'waiting') throw new Error('Top up is not waiting');

		await ctx.db.patch(topUp._id, { status: 'confirmed' });

		await addTopUp(ctx, {
			topUpId: topUp._id,
			owner: topUp.owner,
			value: {
				symbol: topUp.symbol,
				amount,
			},
		});
	},
});

export const persistPolarEvent = defineMutation({
	args: z.object({
		polarEvent: polarEventSchema,
	}),
	handler: async (ctx, { polarEvent }) => {
		//
		await ctx.db.insert('polarEvents', polarEvent);
	},
});

// TODO: add automatic timeout for waiting top ups

export const findOneByPaymentId = defineQuery({
	args: z.object({
		paymentId: z.string(),
	}),
	handler: async (ctx, { paymentId }) => {
		return await findByPaymentId(ctx, { paymentId });
	},
});

export const findOne = defineQuery({
	args: z.object({
		topUpId: zid('topUps'),
	}),
	handler: async (ctx, { topUpId }) => {
		return await ctx.db.get(topUpId);
	},
});

export const findAllWaiting = defineQuery({
	args: z.object({
		owner: zid('users'),
	}),
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

export const findAllByStatus = defineQuery({
	args: z.object({
		owner: zid('users'),
		status: z.enum([
			'confirmed', //
			'failed',
			'waiting',
			'discarded by user',
		]),
	}),
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
