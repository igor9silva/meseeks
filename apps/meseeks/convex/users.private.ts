import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound, Unauthorized } from 'lib/errors';
import { asBigInt } from 'lib/money';
import { tokenSchema } from 'schemas/topUpSchema';
import { addFreeCredits } from './transactions.private';
import { setUserPreference } from './users/preferences.private';
import { components } from './_generated/api';

const setDefaultPreferences = defineMutation({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		//
		// TODO: unhack
		const defaultEnabledSkills = [
			'searchWeb',
			'valyu_search',
			'github_search',
			'twitter_search',
			'searchIdealista',
			'scrapeLink',
			'scrapeTweet',
			'searchPlaces',
			'analyze',
			'compose',
			'transcribeYouTube',
			'describeYouTube',
		];

		await setUserPreference(ctx, {
			userId,
			key: 'enabledSkills',
			value: defaultEnabledSkills,
		});
	},
});

export const seedUserIfNeeded = defineMutation({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		//
		const user = await findUser(ctx, { userId });
		if (user?.isReady) return;

		console.info('new user!', userId);

		// const isVerified = user?.verificationLevel === 'orb';

		await addFreeCredits(ctx, {
			owner: userId,
			value: {
				symbol: 'USD',
				amount: asBigInt({ dollars: 2 }),
			},
			description: 'Welcome credits',
		});

		// TODO: users should be able to spawn their own Convex instance for full isolation and control

		await setDefaultPreferences(ctx, { userId });

		await ctx.db.patch(userId, { isReady: true });
	},
});

export const adjustUserBalance = defineMutation({
	args: z.object({
		userId: zid('users'),
		value: z.object({
			symbol: tokenSchema,
			amount: z.bigint(),
		}),
	}),
	handler: async (ctx, { userId, value }) => {
		//
		const user = await findUser(ctx, { userId });
		if (!user) throw NotFound();

		console.debug('adjust account balance', userId, value.amount);

		if (value.symbol !== 'USD') throw new Error('Only USD is supported for now');

		return await ctx.db.patch(userId, { balanceUSD: (user.balanceUSD ?? 0n) + value.amount });
	},
});

export const findUser = defineQuery({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		return await ctx.db.get(userId);
	},
});

export const findUserByAuthUserId = defineQuery({
	args: z.object({
		authUserId: z.string().min(1),
	}),
	handler: async (ctx, { authUserId }) => {
		//
		return await ctx.db
			.query('users')
			.withIndex('authUserId', (q) => q.eq('authUserId', authUserId))
			.unique();
	},
});

export const findUserByEmail = defineQuery({
	args: z.object({
		email: z.string().min(1),
	}),
	handler: async (ctx, { email }) => {
		//
		return await ctx.db
			.query('users')
			.withIndex('email', (q) => q.eq('email', email))
			.unique();
	},
});

const addUserArgs = z.object({
	authUserId: z.string().min(1),
	email: z.string().min(1).optional(),
	name: z.string().optional(),
	image: z.string().optional(),
	isAnonymous: z.boolean().optional(),
});

const updateExistingUserArgs = addUserArgs.extend({
	userId: zid('users'),
});

export const addUser = defineMutation({
	args: addUserArgs,
	handler: async (ctx, authUser) => {
		//
		const { authUserId, email } = authUser;
		const linkedUser = await findUserByAuthUserId(ctx, { authUserId });

		if (linkedUser) return await patchUser(ctx, { ...authUser, userId: linkedUser._id });

		const userWithEmail = email ? await findUserByEmail(ctx, { email }) : null;
		if (!userWithEmail) return await createUser(ctx, authUser);

		if (userWithEmail.authUserId) {
			console.error('auth user linking conflict', {
				authUserId,
				email,
				matchingUserId: userWithEmail._id,
			});

			throw new Error(`Could not safely link auth user for ${email ?? 'anonymous user'}`);
		}

		return await linkUser(ctx, { ...authUser, userId: userWithEmail._id });
	},
});

export const updateUser = defineMutation({
	args: addUserArgs,
	handler: async (ctx, authUser) => {
		//
		const { authUserId } = authUser;
		const user = await findUserByAuthUserId(ctx, { authUserId });

		if (!user) return addUser(ctx, authUser);

		return await patchUser(ctx, { ...authUser, userId: user._id });
	},
});

export const getCurrentUser = defineQuery({
	args: z.object({}),
	handler: async (ctx) => {
		//
		// get data from JWT
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw Unauthorized();

		const authUserId = identity.subject;
		const { success, data: appUserId } = zid('users').safeParse(identity.userId);

		// grab the user from app users table
		if (success) {
			const user = await findUser(ctx, { userId: appUserId });
			if (user) return user;
		}

		// fallback to Better Auth user table if needed;
		// the first convex jwt after sign-in can be minted before better auth's
		// `user.userId` bridge shows up in the token payload, so fall back to the
		// auth user id during that window.
		const user = await findUserByAuthUserId(ctx, { authUserId });
		if (!user) throw Unauthorized();

		return user;
	},
});

const setAuthUserAppUserId = defineMutation({
	args: z.object({
		authUserId: z.string().min(1),
		userId: zid('users'),
	}),
	handler: async (ctx, { authUserId, userId }) => {
		//
		await ctx.runMutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: 'user',
				where: [{ field: '_id', value: authUserId }],
				update: { userId },
			},
		});
	},
});

const createUser = defineMutation({
	args: addUserArgs,
	handler: async (ctx, authUser) => {
		//
		const { authUserId, email, name, image, isAnonymous } = authUser;
		const userId = await ctx.db.insert('users', {
			authUserId,
			email,
			name,
			image,
			isAnonymous: Boolean(isAnonymous),
			isReady: false,
			balanceUSD: 0n,
		});

		await setAuthUserAppUserId(ctx, { authUserId, userId });
		await seedUserIfNeeded(ctx, { userId });

		return userId;
	},
});

const linkUser = defineMutation({
	args: updateExistingUserArgs,
	handler: async (ctx, args) => {
		//
		const { userId, authUserId, email, name, image, isAnonymous } = args;

		const user = await findUser(ctx, { userId });
		if (!user) throw NotFound();

		await setAuthUserAppUserId(ctx, { authUserId, userId });
		await ctx.db.patch(userId, {
			authUserId,
			email,
			name,
			image,
			isAnonymous: Boolean(isAnonymous),
		});

		return userId;
	},
});

const patchUser = defineMutation({
	args: updateExistingUserArgs,
	handler: async (ctx, args) => {
		//
		const { userId, authUserId, email, name, image, isAnonymous } = args;

		const user = await findUser(ctx, { userId });
		if (!user) throw NotFound();

		await setAuthUserAppUserId(ctx, { authUserId, userId });
		await ctx.db.patch(userId, {
			authUserId,
			email,
			name,
			image,
			isAnonymous: Boolean(isAnonymous),
		});

		return userId;
	},
});
