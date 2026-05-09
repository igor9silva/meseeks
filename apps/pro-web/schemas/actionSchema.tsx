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

const coreActionSchema = z.object({
	taskId: zid('tasks'),
	owner: zid('users'),
	author: authorSchema,
	depth: z.number().min(0).max(1000),
	skillKey: z.string(),
	args: z.record(z.any()),
	// TODO: idea: inherit the argsSchema from the skill, so we can drill types
});

const costFields = {
	maxCost: z.bigint().describe('Worst-case action cost computed before execution, without policy buffer.'),
	estimatedCost: z.bigint().describe('Best current prediction of the actual action cost.'),
};

const authorizationFields = {
	approvedAt: z.number(),
	approvedBy: z.union([
		zid('users'), //
		z.literal('auto'),
	]),
};

const claimFields = {
	claimedAt: z.number().describe('When the reactor claimed this action for execution.'),
	scheduledFunctionId: zid('_scheduled_functions').describe(
		'Internal Convex scheduler id for the action execution function.',
	),
};

const reservationFields = {
	reservedEnergy: z.bigint().describe('Account energy reserved for this action while it runs.'),
	reservedAt: z.number().describe('When account energy was reserved for this action.'),
};

const settlementFields = {
	settledAt: z.number().describe('When this action reservation was settled.'),
};

const startedFields = {
	startedAt: z.number(),
};

const interruptionFields = {
	interruptedAt: z.number().describe('When this running action was marked as interrupted.'),
	interruptedBy: authorSchema.describe('Who interrupted this running action.'),
};

const resolvedFields = {
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
	finishedAt: z.number().describe('When this action reached a conclusive status.'),
};

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

const enqueuedActionSchema = coreActionSchema.extend({
	status: z.literal('enqueued'),
	result: z.null(),
});

const preparedEnqueuedActionSchema = enqueuedActionSchema.extend({
	...costFields,
});

const authorizedEnqueuedActionSchema = preparedEnqueuedActionSchema.extend({
	...authorizationFields,
});

const blockedActionSchema = coreActionSchema.extend({
	...costFields,
	status: z.literal('blocked'),
	result: z.null(),
});

const claimedActionSchema = coreActionSchema.extend({
	...costFields,
	...authorizationFields,
	...claimFields,
	...reservationFields,
	status: z.literal('running'),
	result: z.null(),
});

const startedActionSchema = claimedActionSchema.extend(startedFields);

const interruptedActionSchema = startedActionSchema.extend(interruptionFields);

export const pendingActionSchema = z.union([
	interruptedActionSchema,
	startedActionSchema,
	claimedActionSchema,
	blockedActionSchema,
	authorizedEnqueuedActionSchema,
	preparedEnqueuedActionSchema,
	enqueuedActionSchema,
]);

const resolvedActionFields = {
	...resolvedFields,
	status: resolvedActionStatusSchema,
};

const resolvedActionSchemaWithoutPreflight = coreActionSchema.extend(resolvedActionFields);

const resolvedActionSchemaWithPreflight = coreActionSchema.extend({
	...costFields,
	...resolvedActionFields,
});

const resolvedActionSchemaWithAuthorization = coreActionSchema.extend({
	...costFields,
	...authorizationFields,
	...resolvedActionFields,
});

const resolvedClaimedActionSchema = coreActionSchema.extend({
	...costFields,
	...authorizationFields,
	...claimFields,
	...reservationFields,
	...settlementFields,
	...resolvedActionFields,
});

const resolvedStartedActionSchema = resolvedClaimedActionSchema.extend(startedFields);

const resolvedInterruptedActionSchema = resolvedStartedActionSchema.extend(interruptionFields);

export const resolvedActionSchema = z.union([
	resolvedInterruptedActionSchema,
	resolvedStartedActionSchema,
	resolvedClaimedActionSchema,
	resolvedActionSchemaWithAuthorization,
	resolvedActionSchemaWithPreflight,
	resolvedActionSchemaWithoutPreflight,
]);

export const actionSchema = z
	.union([
		interruptedActionSchema,
		startedActionSchema,
		claimedActionSchema,
		blockedActionSchema,
		authorizedEnqueuedActionSchema,
		preparedEnqueuedActionSchema,
		enqueuedActionSchema,
		resolvedInterruptedActionSchema,
		resolvedStartedActionSchema,
		resolvedClaimedActionSchema,
		resolvedActionSchemaWithAuthorization,
		resolvedActionSchemaWithPreflight,
		resolvedActionSchemaWithoutPreflight,
	])
	.describe(
		'An Action is any occurrence within a Task.', //
	);
