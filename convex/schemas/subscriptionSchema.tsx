import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';

export const subscriptionStatusSchema = z.enum([
	'pending', //
	'active',
	'canceled',
	'past_due',
	'unpaid',
	'revoked',
]);

export const subscriptionSchema = z.object({
	polarSubscriptionId: z.string().optional(),
	owner: zid('users'),
	status: subscriptionStatusSchema,
	validUntil: z.number().optional(),
	paymentUrl: z.string().url(),
	paymentId: z.string(),
	renewalCount: z.number().optional().default(0),
	lastRenewalDate: z.number().optional(),
	isFounder: z.boolean().optional().default(false),
});
