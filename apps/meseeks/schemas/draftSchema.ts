import { zid } from 'convex-helpers/server/zod4';
import { z } from 'zod';
import { skillCallSchema } from './skill';

export const draftSchema = z.object({
	owner: zid('users'),
	taskId: zid('tasks'),
	queue: z.array(skillCallSchema),
	message: z.string(),
	updatedAt: z.number(),
});
