import { createClient, type AuthFunctions } from '@convex-dev/better-auth';
import { components, internal } from '../_generated/api';
import type { DataModel } from '../_generated/dataModel';
import authSchema from './schema';

const betterAuthFunctions: AuthFunctions = {
	onCreate: internal.betterAuthTriggers._onCreate,
	onUpdate: internal.betterAuthTriggers._onUpdate,
};

export const betterAuthComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
	local: {
		schema: authSchema,
	},
	authFunctions: betterAuthFunctions,
	triggers: {
		user: {
			onCreate: async (ctx, user) => {
				await ctx.runMutation(internal.users._addUser, {
					authUserId: user._id,
					email: user.email || undefined,
					name: user.name ?? undefined,
					image: user.image ?? undefined,
					isAnonymous: Boolean(user.isAnonymous),
				});
			},
			onUpdate: async (ctx, user) => {
				await ctx.runMutation(internal.users._updateUser, {
					authUserId: user._id,
					email: user.email || undefined,
					name: user.name ?? undefined,
					image: user.image ?? undefined,
					isAnonymous: Boolean(user.isAnonymous),
				});
			},
		},
	},
});
