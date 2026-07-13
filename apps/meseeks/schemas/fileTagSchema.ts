import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';

export const fileTagSchema = z.object({
	owner: zid('users'),
	file: zid('files'),
	key: z.string().min(1),
	value: z.string(),
	author: authorSchema,
	createdAt: z.number(),
});
