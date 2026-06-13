import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internalMutation } from 'lib/convex';
import { applyExecutionScan } from './fileTransactions.private';

// called by reactor execute after scanning the mounted PRO VFS overlay.
export const _applyExecutionScan = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		action: zid('actions'),
		deletedPaths: z
			.array(
				z.object({
					path: z.string().min(1),
					expectedRevision: zid('file_revisions').optional(),
					beforeContent: z.string().optional(),
				}),
			)
			.default([]),
		files: z.array(
			z.object({
				path: z.string().min(1),
				content: z.string(),
				storageKey: z.string().min(1),
				contentType: z.string().optional(),
				expectedRevision: zid('file_revisions').optional(),
				beforeContent: z.string().optional(),
			}),
		),
	},
	handler: applyExecutionScan,
});
