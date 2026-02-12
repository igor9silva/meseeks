import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { authorSchema } from './authorSchema';
import { tokenSchema } from './topUpSchema';

export const newActionSchema = z.object({
	taskId: zid('tasks'),
	owner: zid('users'),
	author: authorSchema,
	skillKey: z.string().describe('The key of the skill to use'),
	args: z.record(z.any()),
	depth: z.number().min(0).max(1000),
	status: z.enum(['enqueued', 'succeeded']).default('enqueued').optional(),
	result: z.string().optional(),
});

const coreActionSchema = z.object({
	taskId: zid('tasks'),
	owner: zid('users'),
	author: authorSchema,
	depth: z.number().min(0).max(1000),
	skillKey: z.string(),
	args: z.record(z.any()),
	// TODO: idea: inherit the argsSchema from the skill, so we can drill types
	estimatedCost: z.bigint().optional(),
	approvedAt: z.number().optional(),
	approvedBy: z
		.union([
			zid('users'), //
			z.literal('auto'),
		])
		.optional(),
});

export const pendingActionStatusSchema = z.enum([
	'pending authorization', //
	'enqueued',
	'running',
]);

export const resolvedActionStatusSchema = z.enum([
	'succeeded', //
	'skipped',
	'failed',
]);

export const actionStatusSchema = pendingActionStatusSchema.or(resolvedActionStatusSchema);

export const pendingActionSchema = coreActionSchema.extend({
	status: pendingActionStatusSchema,
	result: z.null().optional().default(null), // <------
});

export const resolvedActionSchema = coreActionSchema.extend({
	status: resolvedActionStatusSchema,
	result: z.object({
		text: z.string().optional(),
		// setAt: z.number(),
		reactions: z.array(newActionSchema),
	}),
	costs: z.array(
		z.object({
			symbol: tokenSchema,
			amount: z.bigint(),
			description: z.string(),
		}),
	),
});

export const actionSchema = z
	.union([
		pendingActionSchema, //
		resolvedActionSchema,
	])
	.describe(
		'An Action is any occurrence within a Task.', //
	);
