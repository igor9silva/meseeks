import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';

const coreTriggerSchema = z.object({
	owner: zid('users'),
	handler: zid('files'),
	maxUses: z.number().int().nonnegative(),
	uses: z.number().int().nonnegative(),
	author: authorSchema,
	createdAt: z.number(),
	updatedAt: z.number(),
});

export const fileTriggerSchema = coreTriggerSchema.extend({
	kind: z.literal('file'),
	file: zid('files'),
});

export const loopTriggerSchema = coreTriggerSchema.extend({
	kind: z.literal('loop'),
	loop: zid('loops'),
});

export const triggerSchema = z.union([fileTriggerSchema, loopTriggerSchema]);
