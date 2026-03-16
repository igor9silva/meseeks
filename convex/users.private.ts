import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound, Unauthorized } from 'lib/errors';
import { asBigInt } from 'lib/money';
import { env } from 'schemas/envSchema';
import { tokenSchema } from 'schemas/topUpSchema';
import { findActiveSubscriptions } from './subscriptions.private';
import { addTaskWithActions } from './tasks.private';
import { addFreeCredits } from './transactions.private';
import { setUserPreference } from './users/preferences.private';
import { components, internal } from './_generated/api';

const addInitialTask = defineMutation({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		//
		const initialTaskId = await addTaskWithActions(ctx, {
			author: userId,
			owner: userId,
			title: 'Look at me!',
			instructions: `I want want to learn about Meseeks, so you can provide me with the best assistance possible. Please collect information about me through our conversation and store it using the setUserInfo skill.

I'd like you to gather details such as:
- My name and background
- Where I'm from (birth place, where I grew up, current location)
- My citizenship/nationality
- My profession and interests
- Languages I speak and proficiency levels
- My social media handles
- Any other personal information I share that might be helpful for future interactions

Please update my user information each time you learn something new about me, and make sure to never remove information that is still valid when adding new details. Write everything from my perspective, as if I'm describing myself.

I'm also curious about Meseeks and would love to learn more about its capabilities, features, and how it can help me. Feel free to encourage me to ask questions about what Meseeks can do, how it works, or any other aspects I might be interested in exploring.`,
			skills: [
				{
					skillKey: 'increaseBudget',
					args: {
						amount: asBigInt({ dollars: 1 }),
						shouldIterate: false,
					},
				},
				{
					skillKey: 'lookAtMe',
					args: {},
				},
			],
		});

		await ctx.db.patch(userId, { initialTaskId });

		return initialTaskId;
	},
});

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

		// TODO: this also brings idealista_* (inner skills)
		// const proSkills = await _findAllByOwner(ctx, { owner: 'isPro' });
		// const defaultEnabledSkills = proSkills.map((skill) => skill.key);

		await setUserPreference(ctx, {
			userId,
			key: 'enabledSkills',
			value: defaultEnabledSkills,
		});
	},
});

// const _seedComponentsFromRef = async (
// 	ctx: MutationCtx, //
// 	refUserId: Id<'users'>,
// 	newUserId: Id<'users'>,
// 	inboxTaskId: Id<'tasks'>,
// ) => {
// 	//
// 	// get all reference components
// 	const refComponents = await _findAll(ctx, { userId: refUserId });

// 	// add each one to the seeded user
// 	await Promise.all(
// 		refComponents.map((refComponent) =>
// 			_addComponent(ctx, {
// 				owner: newUserId,
// 				body: refComponent.body,
// 				defaultTaskId: refComponent.defaultTaskId ? inboxTaskId : undefined,
// 				slug: refComponent.slug,
// 			}),
// 		),
// 	);
// };

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

		await addInitialTask(ctx, { userId });

		const queueMarkUserAsReady = () => {
			//
			const delay = 4000; // ms, fake delay for fun
			ctx.scheduler.runAfter(delay, internal.users._markAreReady, { userId });
			// TODO: at somepoint, we'd like users to spawn their own Convex instance for full isolation and control
		};

		// Set default user preferences including enabled skills
		await setDefaultPreferences(ctx, { userId });

		if (!env.REF_USER_ID) {
			console.debug('No ref user ID defined. Skipping seeding components.');
			queueMarkUserAsReady();
			return;
		}

		// const refUser = await findOne(ctx, { userId: env.REF_USER_ID as Id<'users'> });
		// if (!refUser) throw new Error('Ref user not found'); // FATAL (will stop seeding user forever), TODO: notify fatal

		// await _seedComponentsFromRef(ctx, refUser._id, userId, inboxTaskId);
		queueMarkUserAsReady();
	},
});

export const markUserAsReady = defineMutation({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		//
		const user = await findUser(ctx, { userId });
		if (!user) throw NotFound();

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

export const setUserIsFounder = defineMutation({
	args: z.object({
		userId: zid('users'),
		isFounder: z.boolean(),
	}),
	handler: async (ctx, { userId, isFounder }) => {
		//
		const user = await findUser(ctx, { userId });
		if (!user) throw NotFound();

		await ctx.db.patch(userId, { isFounder });
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
	email: z.string().min(1),
	name: z.string().optional(),
	image: z.string().optional(),
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

		const userWithEmail = await findUserByEmail(ctx, { email });
		if (!userWithEmail) return await createUser(ctx, authUser);

		if (userWithEmail.authUserId) {
			console.error('auth user linking conflict', {
				authUserId,
				email,
				matchingUserId: userWithEmail._id,
			});

			throw new Error(`Could not safely link auth user for ${email}`);
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

export const isProSubscriber = defineQuery({
	args: z.object({
		owner: zid('users'),
	}),
	handler: async (ctx, { owner }) => {
		//
		const activeSubscriptions = await findActiveSubscriptions(ctx, { owner });

		return activeSubscriptions.length > 0;
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
		const { authUserId, email, name, image } = authUser;
		const userId = await ctx.db.insert('users', {
			authUserId,
			email,
			name,
			image,
			isReady: false,
			balanceUSD: 0n,
			isFounder: false,
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
		const { userId, authUserId, email, name, image } = args;

		const user = await findUser(ctx, { userId });
		if (!user) throw NotFound();

		await setAuthUserAppUserId(ctx, { authUserId, userId });
		await ctx.db.patch(userId, {
			authUserId,
			email,
			name,
			image,
		});

		return userId;
	},
});

const patchUser = defineMutation({
	args: updateExistingUserArgs,
	handler: async (ctx, args) => {
		//
		const { userId, authUserId, email, name, image } = args;

		const user = await findUser(ctx, { userId });
		if (!user) throw NotFound();

		await setAuthUserAppUserId(ctx, { authUserId, userId });
		await ctx.db.patch(userId, {
			authUserId,
			email,
			name,
			image,
		});

		return userId;
	},
});
