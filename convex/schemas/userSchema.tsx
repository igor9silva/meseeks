import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';

export const userSchema = z.object({
	name: z.string().optional(),
	image: z.string().optional(),
	email: z.string().optional(),
	emailVerificationTime: z.number().optional(),
	phone: z.string().optional(),
	phoneVerificationTime: z.number().optional(),
	isAnonymous: z.literal(false).default(false),
	verificationLevel: z.enum(['orb', 'device']).optional(),
	walletAddress: z.string().optional(), // TODO: write a validator
	walletChain: z.enum(['worldchain']).optional(),
	isReady: z.boolean().default(false),
	balanceUSD: z.bigint().default(0n),
	isFounder: z.boolean().default(false),
	initialTaskId: zid('tasks').optional(),
});

export const userPreferencesSchema = z.object({
	owner: zid('users'),
	key: z.string(),
	value: z.any(),
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
	context: z.record(z.any()).optional(),
});
