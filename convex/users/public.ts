import { getAuthUserId } from '@convex-dev/auth/server';
import { query } from '../lib';
import { env } from '../schemas/envSchema';
import { _findActiveTasks } from '../tasks/private';
import { _isProSubscriber } from '../users/private';
import { _findOne } from './private';

const ALLOWED_DOMAINS = env.ALLOWED_DOMAINS || [];
const ALLOWED_EMAILS = env.ALLOWED_EMAILS || [];

export const current = query({
	args: {},
	handler: async (ctx) => {
		//
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Not authenticated');

		const user = await _findOne(ctx, { userId });
		if (!user) throw new Error('Not found');

		const email = user.email;
		if (!email) throw new Error(`No email found for user ${userId}`);
		if (!isAllowed(email)) throw new Error(`Email ${email} not allowed`);

		return user;
	},
});

export const currentIfPro = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await current(ctx, {});

		const isProSubscriber = await _isProSubscriber(ctx, {
			owner: currentUser._id,
		});

		if (!isProSubscriber) throw new Error('User is not Pro.');

		return currentUser;
	},
});

export const findLockedBalance = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await current(ctx, {});

		const activeTasks = await _findActiveTasks(ctx, { owner: currentUser._id });
		const activeTasksBalance = activeTasks.reduce((acc, task) => acc + task.energyBudget.available, 0n);

		return activeTasksBalance;
	},
});

function isAllowed(email: string) {
	return true;
	// const domain = email.split('@')[1];
	// return ALLOWED_DOMAINS.includes(domain) || ALLOWED_EMAILS.includes(email);
}
