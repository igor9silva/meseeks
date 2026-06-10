import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';

export const readSchema = z.object({
	user: zid('users'),
	file: zid('files'),
	lastReadActionIndex: z.number().int().nonnegative(),
	lastReadAt: z.number(),
});
