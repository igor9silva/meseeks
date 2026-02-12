import { z } from 'zod';
import { internalMutation, internalQuery, mutation, query } from 'lib/functions';
import { getUserPreference, setUserPreference } from './preferences.private';
import { getCurrentUser } from '../users.private';

// used by magicRock.private.ts to inject stored userInfo into instruction templates
export const _getUserPreference = internalQuery({
	args: getUserPreference.args.shape,
	handler: getUserPreference,
});

// used by builtIn/setUserInfo.ts so the ai can persist learned user profile data
export const _setUserPreference = internalMutation({
	args: setUserPreference.args.shape,
	handler: setUserPreference,
});

export const getPreference = query({
	args: {
		key: z.string(),
	},
	handler: async (ctx, { key }) => {
		//
		const user = await getCurrentUser(ctx, {});
		return await getUserPreference(ctx, { userId: user._id, key });
	},
});

export const setPreference = mutation({
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
