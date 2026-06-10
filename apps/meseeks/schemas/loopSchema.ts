import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';

export const loopVisualSchema = z.object({
	icon: z.string().min(1),
	color: z.string().min(1),
	tint: z.string().min(1),
});

export const loopSchema = z.object({
	owner: zid('users'),
	key: z.string().min(1),
	name: z.string().min(1),
	description: z.string().default(''),
	defaultIntelligenceKey: z.string().min(1).optional(),
	visual: loopVisualSchema,
	isPublic: z.boolean().optional(),
	sourceOwner: zid('users').optional(),
	sourceKey: z.string().min(1).optional(),
	author: authorSchema,
	createdAt: z.number(),
	updatedAt: z.number(),
});
