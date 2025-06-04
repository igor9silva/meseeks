import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internal } from '../_generated/api';
import { Id } from '../_generated/dataModel';
import { MutationCtx } from '../_generated/server';
import { internalMutation, internalQuery } from '../lib';
import { env } from '../schemas/envSchema';
import { tokenSchema } from '../schemas/topUpSchema';
import { _findActive } from '../subscriptions/private';
import { _addFreeCredits } from '../transactions/private';
import { asBigInt } from '../utils/money';

export const _seedIfNeeded = async (
	ctx: MutationCtx, //
	userId: Id<'users'>,
) => {
	//
	const user = await _findOne(ctx, { userId });
	if (user?.isReady) return;

	console.info('new user!', userId);

	// const isVerified = user?.verificationLevel === 'orb';

	await _addFreeCredits(ctx, {
		owner: userId,
		value: {
			symbol: 'USD',
			amount: asBigInt({ dollars: 5 }),
		},
		description: 'Welcome $5 for researchers',
	});

	// const inboxTaskId = await _addInboxTask(ctx, {
	// 	author: userId,
	// 	owner: userId,
	// });

	const markAreReady = () => {
		// adding a fake delay for fun
		const delay = 10000; // ms
		ctx.scheduler.runAfter(delay, internal.users.private._markAreReady, { userId });
		// TODO: at somepoint, we'd like users to spawn their own Convex instance for full isolation and control
	};

	if (!env.REF_USER_ID) {
		console.error('No ref user ID defined. Skipping seeding components.');
		markAreReady();
		return;
	}

	// // TODO: create user preferences

	// const refUser = await _findOne(ctx, { userId: env.REF_USER_ID as Id<'users'> });
	// if (!refUser) throw new Error('Ref user not found'); // FATAL (will stop seeding user forever), TODO: notify fatal

	// await _seedComponentsFromRef(ctx, refUser._id, userId, inboxTaskId);
	markAreReady();
};

// const _seedComponentsFromRef = async (
// 	ctx: MutationCtx, //
// 	refUserId: Id<'users'>,
// 	newUserId: Id<'users'>,
// 	inboxTaskId: Id<'tasks'>,
// ) => {
// 	//
// 	// get all reference components
// 	const refComponents = await _findAll(ctx, { userId: refUserId });

// 	// add each one to the seeded user
// 	await Promise.all(
// 		refComponents.map((refComponent) =>
// 			_addComponent(ctx, {
// 				owner: newUserId,
// 				body: refComponent.body,
// 				defaultTaskId: refComponent.defaultTaskId ? inboxTaskId : undefined,
// 				slug: refComponent.slug,
// 			}),
// 		),
// 	);
// };

export const _markAreReady = internalMutation({
	args: {
		userId: zid('users'),
	},
	handler: async (ctx, { userId }) => {
		//
		const user = await _findOne(ctx, { userId });
		if (!user) throw new Error('User not found');

		await ctx.db.patch(userId, { isReady: true });
	},
});

export const _adjustBalance = internalMutation({
	args: {
		userId: zid('users'),
		value: z.object({
			symbol: tokenSchema,
			amount: z.bigint(),
		}),
	},
	handler: async (ctx, { userId, value }) => {
		//
		const user = await _findOne(ctx, { userId });
		if (!user) throw new Error('User not found');

		console.debug('adjust account balance', userId, value.amount);

		if (value.symbol !== 'USD') throw new Error('Only USD is supported for now');

		return await ctx.db.patch(userId, { balanceUSD: (user.balanceUSD ?? 0n) + value.amount });
	},
});

export const _setFounder = internalMutation({
	args: {
		userId: zid('users'),
		isFounder: z.boolean(),
	},
	handler: async (ctx, { userId, isFounder }) => {
		//
		const user = await _findOne(ctx, { userId });
		if (!user) throw new Error('User not found');

		await ctx.db.patch(userId, { isFounder });
	},
});

export const _findOne = internalQuery({
	args: {
		userId: zid('users'),
	},
	handler: async (ctx, { userId }) => {
		return await ctx.db.get(userId);
	},
});

export const _isProSubscriber = internalQuery({
	args: {
		owner: zid('users'),
	},
	handler: async (ctx, { owner }): Promise<boolean> => {
		//
		const activeSubscriptions = await _findActive(ctx, { owner });

		return activeSubscriptions.length > 0;
	},
});
