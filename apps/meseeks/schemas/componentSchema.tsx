import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';

export const componentSchema = z.object({
	owner: zid('users'),
	component: zid('files'),
	defaultFile: zid('files').optional(),
	body: z.string().max(100000).optional(),
	isPublic: z.boolean().optional().default(false),
	slug: z.string().optional(),
});
