import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';

export const subscriptionStatusSchema = z.enum(['pending', 'active']);

export const subscriptionSchema = z.object({
	owner: zid('users'),
	status: subscriptionStatusSchema,
	validUntil: z.number().optional(),
	paymentUrl: z.string().url(),
	paymentId: z.string(),
});
