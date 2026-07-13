import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound, Unauthorized } from 'lib/errors';
import { asBigInt } from 'lib/money';
import { managedSeedVersion, rootFileNameFor } from 'lib/proDefinitions';
import { tokenSchema } from 'schemas/topUpSchema';
import type { Doc } from './_generated/dataModel';
import { findChildByName, createFile, adjustFileBudget } from './files.private';
import { seedManagedLoops } from './loops.private';
import { seedManagedRoutes } from './routes.private';
import { seedManagedSkills } from './skills.private';
import { findActiveSubscriptions } from './subscriptions.private';
import { addFreeCredits } from './transactions.private';
import { seedManagedLoopTriggers } from './triggers.private';
import { components } from './_generated/api';

export const bootstrapUserWorkspace = defineMutation({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		//
		const user = await findUser(ctx, { userId });
		if (!user) throw NotFound();

		await addFreeCredits(ctx, {
			owner: userId,
			value: {
				symbol: 'USD',
				amount: asBigInt({ dollars: 2 }),
			},
			description: 'Welcome credits',
		});

		const rootName = rootFileNameFor({ name: user.name });
		const existingRoot = await findChildByName(ctx, {
			owner: userId,
			name: rootName,
		});
		const rootFileId =
			user.rootFileId ??
			existingRoot?._id ??
			(await createFile(ctx, {
				owner: userId,
				name: rootName,
				author: userId,
				content: `# ${rootName}\n\nThis is your PRO root file. It can have content, children, tags, actions, triggers, routes, and budget.`,
				tags: [
					{ key: 'kind', value: 'task' },
					{ key: 'status', value: 'active' },
				],
				shouldAddInboxTag: false,
			}));

		await ctx.db.patch(userId, { rootFileId });

		const index = await findChildByName(ctx, {
			owner: userId,
			parent: rootFileId,
			name: 'index.md',
		});
		if (!index) {
			await createFile(ctx, {
				owner: userId,
				parent: rootFileId,
				name: 'index.md',
				author: userId,
				content: `# ${rootName}\n\nPRO reads this file as the preferred main content for your root.`,
				shouldAddInboxTag: false,
			});
		}

		await adjustFileBudget(ctx, {
			owner: userId,
			file: rootFileId,
			author: userId,
			amount: asBigInt({ dollars: 1 }),
		});

		return rootFileId;
	},
});

export const seedUserIfNeeded = defineMutation({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		//
		const user = await findUser(ctx, { userId });
		if (!user) throw NotFound();

		if (!user.isReady) {
			console.info('new user', userId);

			await bootstrapUserWorkspace(ctx, { userId });
			await ctx.db.patch(userId, { isReady: true });
		}
	},
});

export const syncProDefinitions = defineMutation({
	args: z.object({
		owner: zid('users'),
	}),
	handler: async (ctx, { owner }) => {
		//
		const user = await findUser(ctx, { userId: owner });
		if (!user) throw NotFound();
		if (!user.rootFileId) throw NotFound();

		const wasCurrent = user.managedSeedVersion === managedSeedVersion;
		const loops = await seedManagedLoops(ctx, { owner, author: owner, auditFile: user.rootFileId });
		const triggers = await seedManagedLoopTriggers(ctx, { owner, author: owner, auditFile: user.rootFileId });
		const routes = await seedManagedRoutes(ctx, { owner, author: owner });
		const skills = await seedManagedSkills(ctx, { owner, author: owner, parent: user.rootFileId });
		await ctx.db.patch(owner, { managedSeedVersion });

		return {
			status: wasCurrent ? 'checked' : 'synced',
			loops: loops.length,
			triggers: triggers.length,
			routes: routes.length,
			skills: skills.length,
		};
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
	handler: async (ctx, { userId }) => await ctx.db.get(userId),
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
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw Unauthorized();

		const authUserId = identity.subject;
		const { success, data: appUserId } = zid('users').safeParse(identity.userId);

		if (success) {
			const user = await findUser(ctx, { userId: appUserId });
			if (user) return withSpendableBalance(user);
		}

		const user = await findUserByAuthUserId(ctx, { authUserId });
		if (!user) throw Unauthorized();

		return withSpendableBalance(user);
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
			committedBudgetUSD: 0n,
			isFounder: false,
		});

		await setAuthUserAppUserId(ctx, { authUserId, userId });
		await seedUserIfNeeded(ctx, { userId });

		return userId;
	},
});

function withSpendableBalance(user: Doc<'users'>) {
	//
	return {
		...user,
		spendableBalanceUSD: (user.balanceUSD ?? 0n) - (user.committedBudgetUSD ?? 0n),
	};
}

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

		await seedUserIfNeeded(ctx, { userId });

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

		await seedUserIfNeeded(ctx, { userId });

		return userId;
	},
});
