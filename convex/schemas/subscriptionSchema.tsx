import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { authorSchema } from './authorSchema';

export const subscriptionPlanSchema = z.enum(['pro', 'founder']);

export const subscriptionStatusSchema = z.enum(['waiting', 'active']);

export const subscriptionSchema = z.object({
	owner: zid('users'),
	author: authorSchema,
	plan: subscriptionPlanSchema,
	status: subscriptionStatusSchema,
	validUntil: z.number().optional(),
	paymentUrl: z.string().url(),
	paymentId: z.string(),
});
