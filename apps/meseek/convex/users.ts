import { internalMutation, query } from 'lib/convex';
import { findActiveTasks } from './tasks.private';
import { addUser, getCurrentUser, isProSubscriber, updateUser } from './users.private';

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
		const activeTasks = await findActiveTasks(ctx, { owner: currentUser._id });

		return activeTasks.reduce((acc, task) => acc + task.energyBudget.available, 0n);
	},
});
