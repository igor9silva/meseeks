import { z } from 'zod';
import { internalMutation, query } from 'lib/functions';
import { findActiveTasks } from './tasks.private';
import { current as getCurrentUser, isProSubscriber, markAreReady } from './users.private';

export const _markAreReady = internalMutation({
	args: markAreReady.args.shape,
	handler: async (ctx, args) => {
		//
		await markAreReady(ctx, args);
	},
});

export const current = query({
	args: getCurrentUser.args.shape,
	handler: async (ctx, args) => {
		//
		return await getCurrentUser(ctx, args);
	},
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

		const activeTasks = z
			.array(
				z.object({
					energyBudget: z.object({
						available: z.bigint(),
					}),
				}),
			)
			.parse(await findActiveTasks(ctx, { owner: currentUser._id }));

		const activeTasksBalance = activeTasks.reduce((acc, task) => acc + task.energyBudget.available, 0n);

		return activeTasksBalance;
	},
});
