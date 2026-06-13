'use node';

import { zid } from 'convex-helpers/server/zod3';
import { action, internalAction } from 'lib/convex';
import { trustedIntelligenceKeys } from 'lib/intelligences';
import { actArgsSchema, actHandler, performScheduled } from './reactor/lifecycle.private';

export const getTrustedIntelligenceKeys = action({
	args: {},
	handler: async () => trustedIntelligenceKeys,
});

export const _performScheduled = internalAction({
	args: {
		action: zid('actions'),
	},
	handler: performScheduled,
});

export const act = action({
	args: actArgsSchema.shape,
	handler: actHandler,
});
