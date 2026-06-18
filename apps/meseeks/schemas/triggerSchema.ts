import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { newActionSchema } from './actionSchema';
import { fileRevisionChangeKindSchema } from './fileRevisionSchema';

export const triggerStatusSchema = z.enum(['enabled', 'disabled', 'errored']);

const baseTriggerSchema = z.object({
	owner: zid('users'),
	root: zid('files'),
	author: zid('actions'),
	status: triggerStatusSchema,
	sourceFile: zid('files').optional(),
	sourcePath: z.string().optional(),
	sourceHash: z.string().optional(),
	compiledBy: zid('actions').optional(),
	compiledAt: z.number().optional(),
	maxUses: z.number().int().positive().optional(),
	remainingUses: z.number().int().min(0).optional(),
	lastRunAt: z.number().optional(),
	lastError: z.string().optional(),
	runCount: z.number().int().min(0).default(0),
});

export const codeTriggerSchema = baseTriggerSchema.extend({
	kind: z.literal('code'),
	file: zid('files'),
});

export const mutationTriggerSchema = baseTriggerSchema.extend({
	kind: z.literal('mutation'),
	events: z.array(fileRevisionChangeKindSchema),
	pattern: z.string().optional(),
	reactions: z.array(newActionSchema).min(1).max(5),
});

export const actionTriggerSchema = baseTriggerSchema.extend({
	kind: z.literal('action'),
	skills: z.array(z.string()).optional(),
	statuses: z.array(z.string()).optional(),
});

export const scheduleTriggerSchema = baseTriggerSchema.extend({
	kind: z.literal('schedule'),
	schedule: z.string().describe('One-time timestamp or recurring expression. Timestamp values include timezone.'),
	nextRunAt: z.number().optional(),
	scheduledFunctionId: zid('_scheduled_functions').optional(),
});

export const triggerSchema = z
	.union([codeTriggerSchema, mutationTriggerSchema, actionTriggerSchema, scheduleTriggerSchema])
	.describe('Durable Reactor rule.');
