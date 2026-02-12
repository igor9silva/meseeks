import { getAuthUserId } from '@convex-dev/auth/server';
import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { Id } from './_generated/dataModel';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { asBigInt } from 'lib/money';
import { env } from 'schemas/envSchema';
import { tokenSchema } from 'schemas/topUpSchema';
import { findActiveSubscriptions } from './subscriptions.private';
import { addWithActions } from './tasks.private';
import { addFreeCredits } from './transactions.private';
import { setUserPreference } from './users/preferences.private';
import { internal } from './_generated/api';

const addInitialTask = async (ctx: Parameters<typeof addWithActions>[0], { userId }: { userId: Id<'users'> }) => {
	//
	const initialTaskId = await addWithActions(ctx, {
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
};

const setDefaultPreferences = async (
	ctx: Parameters<typeof setUserPreference>[0],
	{ userId }: { userId: Id<'users'> },
) => {
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
};

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

export const seedIfNeeded = defineMutation({
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

		const markAreReady = () => {
			//
			const delay = 4000; // ms, fake delay for fun
			ctx.scheduler.runAfter(delay, internal.users._markAreReady, { userId });
			// TODO: at somepoint, we'd like users to spawn their own Convex instance for full isolation and control
		};

		// Set default user preferences including enabled skills
		await setDefaultPreferences(ctx, { userId });

		if (!env.REF_USER_ID) {
			console.debug('No ref user ID defined. Skipping seeding components.');
			markAreReady();
			return;
		}

		// const refUser = await findOne(ctx, { userId: env.REF_USER_ID as Id<'users'> });
		// if (!refUser) throw new Error('Ref user not found'); // FATAL (will stop seeding user forever), TODO: notify fatal

		// await _seedComponentsFromRef(ctx, refUser._id, userId, inboxTaskId);
		markAreReady();
	},
});

export const markAreReady = defineMutation({
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

export const adjustBalance = defineMutation({
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

export const setFounder = defineMutation({
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

export const getCurrentUser = defineQuery({
	args: z.object({}),
	handler: async (ctx) => {
		//
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Not authenticated');

		const user = await findUser(ctx, { userId });
		if (!user) throw new Error('Not found');

		const email = user.email;
		if (!email) throw new Error(`No email found for user ${userId}`);
		if (!isAllowed(email)) throw new Error(`Email ${email} not allowed`);

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

function isAllowed(email: string) {
	return true;
	// const domain = email.split('@')[1];
	// return ALLOWED_DOMAINS.includes(domain) || ALLOWED_EMAILS.includes(email);
}
