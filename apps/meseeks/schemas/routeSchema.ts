import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';

export const routeSchema = z.object({
	owner: zid('users'),
	slug: z.string().min(1),
	file: zid('files'),
	defaultFile: zid('files').optional(),
	isPublic: z.boolean().optional(),
	sourceOwner: zid('users').optional(),
	sourceKey: z.string().min(1).optional(),
	sourceFile: zid('files').optional(),
	author: authorSchema,
	createdAt: z.number(),
	updatedAt: z.number(),
});
