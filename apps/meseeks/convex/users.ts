import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internalMutation, internalQuery, query } from 'lib/convex';
import { Unauthorized } from 'lib/errors';
import { addUser, findUser, findUserByAuthUserId, getCurrentUser, isProSubscriber, updateUser } from './users.private';

// called by the better auth user.onCreate trigger to add the app user row or
// link the auth user to an existing one.
export const _addUser = internalMutation({
	args: addUser.args.shape,
	handler: addUser,
});

// called by the better auth user.onUpdate trigger to keep the linked app user in sync
export const _updateUser = internalMutation({
	args: updateUser.args.shape,
	handler: updateUser,
});

export const _findCurrentByIdentity = internalQuery({
	args: {
		authUserId: z.string().min(1),
		appUserId: zid('users').optional(),
	},
	handler: async (ctx, { authUserId, appUserId }) => {
		//
		if (appUserId) {
			const user = await findUser(ctx, { userId: appUserId });
			if (user) return user;
		}

		const user = await findUserByAuthUserId(ctx, { authUserId });
		if (!user) throw Unauthorized();

		return user;
	},
});

// public entrypoint used by the app; keeps auth + allowlist logic centralized in users.private.getCurrentUser
export const current = query({
	args: getCurrentUser.args.shape,
	handler: getCurrentUser,
});

export const currentIfPro = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		const isCurrentUserProSubscriber = await isProSubscriber(ctx, {
			owner: currentUser._id,
		});

		if (!isCurrentUserProSubscriber) throw new Error('User is not Pro.');

		return currentUser;
	},
});

export const findLockedBalance = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return currentUser.committedBudgetUSD ?? 0n;
	},
});
