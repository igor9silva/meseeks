import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';

export const fileLinkKindSchema = z.enum(['copy', 'fork', 'source', 'attachment', 'mount', 'usage']);

export const fileLinkSchema = z.object({
	owner: zid('users'),
	from: zid('files'),
	to: zid('files'),
	kind: fileLinkKindSchema,
	author: authorSchema,
	createdAt: z.number(),
});
