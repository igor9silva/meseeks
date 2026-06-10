import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { actionWarningSchema, costSchema } from './actionSchema';

const coreDetailSchema = z.object({
	action: zid('actions'),
	createdAt: z.number(),
	updatedAt: z.number(),
});

export const modelDetailSchema = coreDetailSchema.extend({
	kind: z.literal('model'),
	skill: zid('skills').optional(),
	skillFile: zid('files').optional(),
	provider: z.string().min(1),
	model: z.string().min(1),
	input: z.unknown().optional(),
	output: z.unknown().optional(),
	metadata: z.record(z.unknown()).optional(),
	reasoningFile: zid('files').optional(),
	usage: z.unknown().optional(),
	costs: z.array(costSchema).default([]),
	warnings: z.array(actionWarningSchema).optional(),
});

export const requestDetailSchema = coreDetailSchema.extend({
	kind: z.literal('request'),
	skill: zid('skills').optional(),
	skillFile: zid('files').optional(),
	url: z.string().min(1),
	method: z.string().min(1),
	status: z.number().int().optional(),
	requestFile: zid('files').optional(),
	responseFile: zid('files').optional(),
	costs: z.array(costSchema).default([]),
	warnings: z.array(actionWarningSchema).optional(),
});

export const executionDetailSchema = coreDetailSchema.extend({
	kind: z.literal('execution'),
	skill: zid('skills').optional(),
	skillFile: zid('files').optional(),
	box: zid('boxes').optional(),
	command: z.string().min(1).optional(),
	stdoutFile: zid('files').optional(),
	stderrFile: zid('files').optional(),
	outputFiles: z.array(zid('files')).default([]),
	exitCode: z.number().int().optional(),
	costs: z.array(costSchema).default([]),
	warnings: z.array(actionWarningSchema).optional(),
});

export const mutationDetailSchema = coreDetailSchema.extend({
	kind: z.literal('mutation'),
	skill: zid('skills').optional(),
	summary: z.string().min(1),
	resultFile: zid('files').optional(),
	metadata: z.record(z.unknown()).optional(),
	warnings: z.array(actionWarningSchema).optional(),
});

export const warningDetailSchema = coreDetailSchema.extend({
	kind: z.literal('warning'),
	key: z.string().min(1),
	severity: z.enum(['info', 'warning', 'error']),
	message: z.string().min(1),
	source: z.enum(['claim', 'perform', 'settle', 'runtime']),
});

export const actionDetailSchema = z.union([
	modelDetailSchema,
	requestDetailSchema,
	executionDetailSchema,
	mutationDetailSchema,
	warningDetailSchema,
]);
