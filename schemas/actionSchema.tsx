import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
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

export const reactionTriggerSchema = z.enum(['finish', 'none']);

const coreActionSchema = z.object({
	taskId: zid('tasks'),
	owner: zid('users'),
	author: authorSchema,
	depth: z.number().min(0).max(1000),
	skillKey: z.string(),
	args: z.record(z.any()),
	// TODO: idea: inherit the argsSchema from the skill, so we can drill types
	estimatedCost: z.bigint().optional(),
	maxCost: z.bigint().optional().describe('Worst-case cost for this action, before any task policy buffer.'),
	reservedEnergy: z.bigint().optional().describe('Account energy reserved for this action before execution.'),
	claimedAt: z.number().optional().describe('When the reactor reserved this action execution slot.'),
	startedAt: z.number().optional(),
	finishedAt: z.number().optional().describe('When this action reached a final status.'),
	reservedAt: z.number().optional().describe('When account energy was reserved for this action.'),
	settledAt: z.number().optional().describe('When this action reservation was settled.'),
	interruptedAt: z.number().optional().describe('When this running action was interrupted by a newer action.'),
	interruptedBy: authorSchema.optional().describe('Who interrupted this running action.'),
	reactionTrigger: reactionTriggerSchema
		.optional()
		.describe('Whether finishing this action can trigger reactions. Missing means finish for legacy actions.'),
	authorizationRequestedAt: z.number().optional().describe('When this action started waiting for authorization.'),
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
	'blocked', //
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
