import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internalMutation, query } from 'lib/convex';
import { getBox as getBoxHelper, getOrCreateBox, updateBox } from './boxes.private';

export const getBox = query({
	args: {
		directory: zid('files'),
	},
	handler: getBoxHelper,
});

// called by reactor execute to create or reuse the directory box record.
export const _getOrCreateBox = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		action: zid('actions'),
	},
	handler: getOrCreateBox,
});

// called by reactor execute to persist Daytona lifecycle and sync metadata.
export const _updateBox = internalMutation({
	args: {
		box: zid('boxes'),
		owner: zid('users'),
		status: z.enum(['idle', 'running', 'failed']),
		action: zid('actions').optional(),
		providerSandboxId: z.string().optional(),
		logs: z.string().optional(),
		changedFiles: z.array(z.string()).optional(),
		lifecycle: z.record(z.string()).optional(),
	},
	handler: updateBox,
});
