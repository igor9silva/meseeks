import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';

export const webPushSubscriptionSchema = z.object({
	userId: zid('users'),
	subscription: z.object({
		endpoint: z.string().url(),
		keys: z.object({
			p256dh: z.string(),
			auth: z.string(),
		}),
	}),
	userAgent: z.string().optional(),
	createdAt: z.number().default(() => Date.now()),
	lastUsedAt: z.number().default(() => Date.now()),
	isEnabled: z.boolean().default(true),
});
