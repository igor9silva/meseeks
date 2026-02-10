import { z } from 'zod';
import { internalMutation, internalQuery, mutation, query } from '../lib';
import { getUserPreference, setUserPreference } from './preferences.private';
import { current } from '../users.private';

export const _getUserPreference = internalQuery({
	args: getUserPreference.args.shape,
	handler: async (ctx, args) => {
		//
		return await getUserPreference(ctx, args);
	},
});

export const _setUserPreference = internalMutation({
	args: setUserPreference.args.shape,
	handler: async (ctx, args) => {
		//
		return await setUserPreference(ctx, args);
	},
});

export const getPreference = query({
	args: {
		key: z.string(),
	},
	handler: async (ctx, { key }) => {
		//
		const user = await current(ctx, {});
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
		const user = await current(ctx, {});
		return await setUserPreference(ctx, { userId: user._id, key, value });
	},
});
