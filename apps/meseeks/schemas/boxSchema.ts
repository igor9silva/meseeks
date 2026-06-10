import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';

export const boxStatusSchema = z.enum(['creating', 'running', 'idle', 'repairing', 'terminated', 'failed']);

export const boxSchema = z.object({
	owner: zid('users'),
	file: zid('files'),
	author: authorSchema,
	provider: z.string().min(1),
	providerReference: z.string().min(1).optional(),
	status: boxStatusSchema,
	createdAt: z.number(),
	updatedAt: z.number(),
	lastUsedAt: z.number().optional(),
	expiresAt: z.number().optional(),
});
