import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';

export const indexSchema = z.object({
	owner: zid('users'),
	file: zid('files'),
	kind: z.enum(['embedding', 'fulltext', 'summary', 'preview']),
	status: z.enum(['pending', 'ready', 'failed', 'stale']),
	data: z.record(z.unknown()).optional(),
	storageKey: z.string().min(1).optional(),
	updatedAt: z.number(),
});
