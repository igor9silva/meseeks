import { zid } from 'convex-helpers/server/zod4';
import { z } from 'zod';
import { skillCallSchema } from './skillCallSchema';

export const draftQueueItemSchema = skillCallSchema;

export const draftSchema = z.object({
	owner: zid('users'),
	taskId: zid('tasks'),
	queue: z.array(draftQueueItemSchema),
	message: z.string(),
	updatedAt: z.number(),
});
