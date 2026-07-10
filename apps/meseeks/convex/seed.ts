import { z } from 'zod/v3';
import { zid } from 'convex-helpers/server/zod3';
import { internalMutation } from 'lib/convex';
import { recommendedIntelligences } from 'lib/proDefinitions';
import { env } from 'schemas/envSchema';
import { configuredProOwner } from './proOwner.private';
import { seedUserIfNeeded, syncProDefinitions } from './users.private';
import type { MutationCtx } from './_generated/server';

export const _all = internalMutation({
	args: z.object({}),
	handler: async (ctx) => {
		//
		const proOwner = configuredProOwner() ?? (await previewProOwner(ctx));
		if (!proOwner) {
			return {
				intelligences: recommendedIntelligences.map((intelligence) => intelligence.key),
				managedCatalog: 'app-local',
				proDefinitions: {
					status: 'not-configured',
				},
			};
		}

		try {
			await seedUserIfNeeded(ctx, { userId: proOwner });
			const proDefinitions = await syncProDefinitions(ctx, { owner: proOwner });

			return {
				intelligences: recommendedIntelligences.map((intelligence) => intelligence.key),
				managedCatalog: 'app-local',
				proDefinitions,
			};
		} catch (error) {
			console.warn('pro definitions seed skipped', {
				proOwner,
				error,
			});

			return {
				intelligences: recommendedIntelligences.map((intelligence) => intelligence.key),
				managedCatalog: 'app-local',
				proDefinitions: {
					status: 'missing-owner',
					owner: proOwner,
				},
			};
		}
	},
});

export const _syncPro = internalMutation({
	args: z.object({
		owner: zid('users'),
	}),
	handler: syncProDefinitions,
});

async function previewProOwner(ctx: MutationCtx) {
	//
	if (env.ENV_TYPE === 'production') return undefined;

	const email = `seed+${env.ENV_TYPE}@pro.local`;
	const existing = await ctx.db
		.query('users')
		.withIndex('email', (q) => q.eq('email', email))
		.unique();
	if (existing) return existing._id;

	return await ctx.db.insert('users', {
		email,
		name: 'PRO',
		isReady: false,
		balanceUSD: 0n,
		committedBudgetUSD: 0n,
		isFounder: false,
	});
}
