import { z } from 'zod/v3';
import { internalMutation, internalQuery, mutation, query } from 'lib/convex';
import { findUserPreference, setUserPreference } from './preferences.private';
import { getCurrentUser } from '../users.private';

// used by magicRock.private.ts to inject stored userInfo into instruction templates
export const _getUserPreference = internalQuery({
	args: findUserPreference.args.shape,
	handler: findUserPreference,
});

// internal write path for trusted preference updates
export const _setUserPreference = internalMutation({
	args: setUserPreference.args.shape,
	handler: setUserPreference,
});

export const get = query({
	args: {
		key: z.string(),
	},
	handler: async (ctx, { key }) => {
		//
		const user = await getCurrentUser(ctx, {});
		return await findUserPreference(ctx, { userId: user._id, key });
	},
});

export const set = mutation({
	args: {
		key: z.string(),
		value: z.unknown(),
	},
	handler: async (ctx, { key, value }) => {
		//
		const user = await getCurrentUser(ctx, {});
		return await setUserPreference(ctx, { userId: user._id, key, value });
	},
});
