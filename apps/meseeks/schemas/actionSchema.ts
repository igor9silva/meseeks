import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';
import { tokenSchema } from './topUpSchema';

export const actionStatusSchema = z.enum([
	'pending authorization',
	'enqueued',
	'running',
	'succeeded',
	'failed',
	'skipped',
	'interrupted',
]);

export const costSchema = z.object({
	symbol: tokenSchema,
	amount: z.bigint(),
	description: z.string().min(1),
});

export const actionResultFileSchema = z.object({
	file: zid('files'),
	path: z.string().min(1),
	size: z.number().int().nonnegative().optional(),
	contentType: z.string().min(1).optional(),
	readMethods: z.array(z.enum(['read', 'cat', 'head', 'tail'])).default(['read']),
});

export const actionResultSchema = z.object({
	text: z.string().optional(),
	files: z.array(actionResultFileSchema).default([]),
	metadata: z.record(z.unknown()).optional(),
});

export const actionWarningSchema = z.object({
	key: z.string().min(1),
	severity: z.enum(['info', 'warning', 'error']),
	message: z.string().min(1),
	source: z.enum(['claim', 'perform', 'settle']),
	createdAt: z.number(),
});

export const actionSchema = z.object({
	owner: zid('users'),
	file: zid('files'),
	index: z.number().int().nonnegative(),
	depth: z.number().int().nonnegative(),
	spark: zid('actions').optional(),
	author: authorSchema,
	skillKey: z.string().min(1),
	loopKey: z.string().min(1).optional(),
	intelligenceKey: z.string().min(1).optional(),
	args: z.record(z.unknown()),
	status: actionStatusSchema,
	result: actionResultSchema.optional(),
	warnings: z.array(actionWarningSchema).optional(),
	patch: z.string().optional(),
	costs: z.array(costSchema).default([]),
	expectedCost: z.bigint().optional(),
	maxCost: z.bigint().optional(),
	reservedBudget: z.bigint().optional(),
	claimedAt: z.number().optional(),
	startedAt: z.number().optional(),
	settledAt: z.number().optional(),
	authorizedAt: z.number().optional(),
	interruptedAt: z.number().optional(),
	createdAt: z.number(),
});
