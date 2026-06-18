import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { authorSchema } from 'schemas/authorSchema';
import { topUpAmountSchema, topUpStatusSchema } from 'schemas/topUpSchema';
import { addTopUpTransaction } from './transactions.private';

export const findTopUpByPaymentId = defineQuery({
	args: z.object({
		paymentId: z.string(),
	}),
	handler: async (ctx, { paymentId }) => {
		//
		return await ctx.db
			.query('top_ups')
			.withIndex('by_paymentId', (q) => q.eq('paymentId', paymentId))
			.first();
	},
});

export const addTopUp = defineMutation({
	args: z.object({
		owner: zid('users'),
		author: authorSchema,
		amount: topUpAmountSchema,
		fee: z.bigint(),
		totalCharged: z.bigint(),
		paymentUrl: z.string().url(),
		paymentId: z.string(),
	}),
	handler: async (ctx, args) => {
		//
		return await ctx.db.insert('top_ups', {
			owner: args.owner,
			author: args.author,
			amount: args.amount,
			fee: args.fee,
			totalCharged: args.totalCharged,
			status: 'waiting',
			paymentUrl: args.paymentUrl,
			paymentId: args.paymentId,
			provider: 'polar',
		});
	},
});

export const finishTopUp = defineMutation({
	args: z.object({
		checkoutId: z.string(),
		amount: z.bigint(),
	}),
	handler: async (ctx, { checkoutId, amount }) => {
		//
		const topUp = await findTopUpByPaymentId(ctx, { paymentId: checkoutId });
		if (!topUp) throw NotFound();
		if (topUp.status !== 'waiting') throw new Error('Top up is not waiting');

		await ctx.db.patch(topUp._id, { status: 'confirmed' });
		await addTopUpTransaction(ctx, {
			owner: topUp.owner,
			value: amount,
			topUp: topUp._id,
			description: 'Top up',
		});
	},
});

export const findTopUp = defineQuery({
	args: z.object({
		topUpId: zid('top_ups'),
	}),
	handler: async (ctx, { topUpId }) => {
		return await ctx.db.get(topUpId);
	},
});

export const findWaitingTopUps = defineQuery({
	args: z.object({
		owner: zid('users'),
	}),
	handler: async (ctx, { owner }) => {
		return await ctx.db
			.query('top_ups')
			.withIndex('by_status_owner', (q) =>
				q
					.eq('status', 'waiting') //
					.eq('owner', owner),
			)
			.collect();
	},
});

export const findTopUpsByStatus = defineQuery({
	args: z.object({
		owner: zid('users'),
		status: topUpStatusSchema,
	}),
	handler: async (ctx, { owner, status }) => {
		return await ctx.db
			.query('top_ups')
			.withIndex('by_status_owner', (q) =>
				q
					.eq('status', status) //
					.eq('owner', owner),
			)
			.collect();
	},
});
