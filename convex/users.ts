import { internalMutation, query } from 'lib/convex';
import { findActiveTasks } from './tasks.private';
import { getCurrentUser, isProSubscriber, markUserAsReady } from './users.private';

// scheduled from users.private.seedUserIfNeeded to flip isReady after the onboarding seed finishes
export const _markAreReady = internalMutation({
	args: markUserAsReady.args.shape,
	handler: markUserAsReady,
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
