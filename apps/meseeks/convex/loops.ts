import { query } from 'lib/convex';
import { findIntelligenceOptions, listLoops } from './loops.private';
import { getCurrentUser } from './users.private';

export const findAll = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const loops = await listLoops(ctx, { owner: currentUser._id });

		return {
			loops,
		};
	},
});

export const intelligenceOptions = query({
	args: {},
	handler: findIntelligenceOptions,
});
