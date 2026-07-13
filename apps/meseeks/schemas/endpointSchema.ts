import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';

export const endpointSchema = z.object({
	owner: zid('users'),
	file: zid('files'),
	trigger: zid('triggers').optional(),
	slugHash: z.string().min(1),
	secretHash: z.string().min(1),
	isActive: z.boolean(),
	author: authorSchema,
	createdAt: z.number(),
	updatedAt: z.number(),
});
