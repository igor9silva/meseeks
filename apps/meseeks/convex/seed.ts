import { z } from 'zod/v3';
import { zid } from 'convex-helpers/server/zod3';
import { internalMutation } from 'lib/convex';
import { recommendedIntelligences } from 'lib/proDefinitions';
import { configuredProOwner } from './proOwner.private';
import { seedUserIfNeeded, syncProDefinitions } from './users.private';

export const _all = internalMutation({
	args: z.object({}),
	handler: async (ctx) => {
		//
		const proOwner = configuredProOwner();
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
