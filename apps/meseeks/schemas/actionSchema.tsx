import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';
import { intelligenceKeys } from './intelligenceSchema';
import { skillKeySchema } from './skillSchema';

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

export const actionSkillSchema = skillKeySchema;
export const actionSparkSchema = zid('actions').or(z.literal('self'));

export const actionCostSchema = z.object({
	kind: z.string().min(1),
	amount: z.bigint(),
	description: z.string().optional(),
});

export const newActionSchema = z
	.object({
		skill: actionSkillSchema,
		input: z.record(z.unknown()),
	})
	.describe('Proposed follow-up action.');

const coreActionSchema = z.object({
	owner: zid('users'),
	root: zid('files'),
	index: z.number().int().min(1),
	author: authorSchema,
	spark: actionSparkSchema,
	skill: actionSkillSchema,
	intelligence: intelligenceKeys.optional(),
	input: z.record(z.unknown()),
	claimedAt: z.number().optional(),
	scheduledFunctionId: zid('_scheduled_functions').optional(),
	startedAt: z.number().optional(),
	interruptedAt: z.number().optional(),
	output: zid('files').optional(),
	costs: z.array(actionCostSchema).optional(),
	warnings: z.array(z.string()).optional(),
});

export const pendingActionSchema = coreActionSchema.extend({
	status: pendingActionStatusSchema,
});

export const resolvedActionSchema = coreActionSchema.extend({
	status: resolvedActionStatusSchema,
	finishedAt: z.number(),
});

export const actionSchema = z
	.union([
		pendingActionSchema, //
		resolvedActionSchema,
	])
	.describe('Durable ledger row for work.');
