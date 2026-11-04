import { zid } from 'convex-helpers/server/zod4';
import { z } from 'zod';
import { authorSchema } from './authorSchema';
import { tokenSchema } from './topUpSchema';
import { skillCallSchema } from './skillCallSchema';

export const newActionSchema = skillCallSchema.extend({
	taskId: zid('tasks'),
	owner: zid('users'),
	author: authorSchema,
	depth: z.number().min(0).max(1000),
	status: z.enum(['enqueued', 'succeeded']).default('enqueued').optional(),
	result: z.string().optional(),
});

const coreActionSchema = skillCallSchema.extend({
	taskId: zid('tasks'),
	owner: zid('users'),
	author: authorSchema,
	depth: z.number().min(0).max(1000),
	// TODO: idea: inherit the argsSchema from the skill, so we can drill types
	estimatedCost: z.bigint().optional(),
	startedAt: z.number().optional(),
	scheduledFunctionId: zid('_scheduled_functions')
		.optional()
		.describe('Internal Convex scheduler id for the action execution function.'),
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
