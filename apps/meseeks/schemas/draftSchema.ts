import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';

export const draftQueueItemSchema = z.object({
	skillKey: z.string(),
	args: z.record(z.unknown()),
});

export const draftSchema = z.object({
	owner: zid('users'),
	fileId: zid('files'),
	queue: z.array(draftQueueItemSchema),
	message: z.string(),
	updatedAt: z.number(),
});
