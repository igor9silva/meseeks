import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';

export const userSchema = z.object({
	authUserId: z.string().optional(),
	name: z.string().optional().describe('Display name.'),
	image: z.string().optional().describe('Profile image URL.'),
	email: z.string().optional(),
	emailVerificationTime: z.number().optional(),
	phone: z.string().optional(),
	phoneVerificationTime: z.number().optional(),
	isAnonymous: z.boolean().default(false),
	energyBalance: z.bigint().default(0n),
	root: zid('files').optional(),
});

export const userRequestKeySchema = z.enum([
	'share_skills', //
	'general_question', //
	'feedback', //
	'enterprise_early_access', //
]);

export const userRequestSchema = z.object({
	owner: zid('users'),
	key: userRequestKeySchema,
	message: z.string().min(1).max(1000),
	context: z.record(z.unknown()).optional(),
});
