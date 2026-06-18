import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { asBigInt } from 'lib/money';
import { authorSchema } from './authorSchema';
import { intelligenceKeys } from './intelligenceSchema';

export const skillKeySchema = z
	.string()
	.min(1)
	.regex(/^(?:@[A-Za-z0-9][A-Za-z0-9_-]*\/)?[A-Za-z][A-Za-z0-9:_/-]*$/);

export const skillOwnerSchema = z.union([
	z.literal('isPro'), //
	zid('users'),
]);

export const skillAuthorSchema = z.union([
	authorSchema, //
	z.literal('isPro'),
]);

export const configuredSkillKindSchema = z.enum([
	'think', //
	'request',
	'execute',
]);

export const instinctSkillKindSchema = z.enum([
	'say', //
	'think',
	'request',
	'execute',
	'create',
	'write',
	'move',
	'tag',
	'untag',
	'interrupt',
	'seed',
	'prepareUpload',
	'commitUpload',
	'createTrigger',
	'disableTrigger',
	'compile',
]);

export const skillKindSchema = configuredSkillKindSchema.or(instinctSkillKindSchema);

export const skillSourceSchema = z.enum([
	'instinct', // code-owned runtime skill
	'file',
	'manual',
]);

export const serializedSchemaStringSchema = z.string().min(1);

export const instinctSchema = z.object({
	key: skillKeySchema,
	kind: instinctSkillKindSchema,
	description: z.string(),
	inputSchema: serializedSchemaStringSchema,
	outputSchema: serializedSchemaStringSchema,
});

export const httpConfigSchema = z.object({
	url: z.string().url(),
	method: z.enum([
		'GET', //
		'POST',
		'PUT',
		'PATCH',
		'DELETE',
	]),
	headers: z.record(z.string()).optional(),
	paramMappings: z.array(
		z.object({
			type: z.enum([
				'search', //
				'header',
				'path',
				'body',
				'bodyPath',
			]),
			source: z.string(),
			target: z.string(),
		}),
	),
	body: z
		.object({
			template: z.record(z.unknown()).optional(),
		})
		.optional(),
});

export const instructionVariableSchema = z.union([
	z.literal('root'),
	z.literal('root.id'),
	z.literal('root.path'),
	z.literal('root.metadata'),
	z.literal('root.budget'),
	z.literal('action'),
	z.literal('action.id'),
	z.literal('action.skill'),
	z.literal('action.input'),
	z.literal('files'),
	z.literal('currentDate'),
	z.literal('userInfo'),
	z.literal('allSkills'),
	z.literal('activeSkills'),
	z.string().regex(/^input\..+$/),
]);

export const decisionConfigSchema = z.object({
	model: intelligenceKeys.or(z.literal('auto')),
	instructions: z.string(),
	temperature: z.number().min(0).max(2),
	availableSkills: z.array(skillKeySchema),
	historyMode: z.enum([
		// 'none', //
		'since last instructed',
		'all',
	]),
	topP: z.number().min(0).max(1).optional(),
	topK: z.number().optional(),
	maxTokens: z.number().optional(),
	maxRetries: z.number().optional(),
	frequencyPenalty: z.number().min(-1).max(1).optional(),
	stopSequences: z.array(z.string()).optional(),
	seed: z.number().optional(),
});

export const executeConfigSchema = z.object({
	language: z
		.enum([
			'javascript', //
			'python',
		])
		.optional(),
	timeoutSeconds: z.number().int().positive().optional(),
});

export const skillCostSchema = z.union([
	z.literal('dynamic'), //
	z
		.bigint()
		.min(asBigInt({ dollars: 0 }))
		.max(asBigInt({ dollars: 1000 })),
]);

export const preApprovedCostSchema = z.union([
	z.literal('none'), //
	z
		.bigint()
		.min(asBigInt({ dollars: 0 }))
		.max(asBigInt({ dollars: 1000 })),
]);

const coreSkillSchema = z.object({
	key: skillKeySchema,
	description: z.string(),
	inputSchema: serializedSchemaStringSchema,
	outputSchema: serializedSchemaStringSchema,
	preApprovedCost: preApprovedCostSchema,
	owner: skillOwnerSchema,
	author: skillAuthorSchema,
	source: skillSourceSchema,
	root: zid('files').optional(),
	sourceFile: zid('files').optional(),
	sourcePath: z.string().optional(),
	sourceHash: z.string().optional(),
	compiledBy: zid('actions').optional(),
	compiledAt: z.number().optional(),
	isHidden: z.boolean().optional(),
	priority: z.number().optional(),
});

export const instinctSkillSchema = coreSkillSchema.extend({
	source: z.literal('instinct'),
	kind: instinctSkillKindSchema,
	cost: skillCostSchema,
	config: z.record(z.unknown()).optional(),
});

const configuredSkillSchema = coreSkillSchema.extend({
	source: z.union([
		z.literal('file'), //
		z.literal('manual'),
	]),
});

export const thinkSkillSchema = configuredSkillSchema.extend({
	kind: z.literal('think'),
	cost: z.literal('dynamic'),
	config: decisionConfigSchema,
});

export const requestSkillSchema = configuredSkillSchema.extend({
	kind: z.literal('request'),
	cost: z
		.bigint()
		.min(asBigInt({ dollars: 0 }))
		.max(asBigInt({ dollars: 1000 })),
	config: httpConfigSchema,
});

export const executeSkillSchema = configuredSkillSchema.extend({
	kind: z.literal('execute'),
	cost: z.literal('dynamic'),
	config: executeConfigSchema,
});

export const skillSchema = z
	.union([
		instinctSkillSchema, //
		thinkSkillSchema, //
		requestSkillSchema,
		executeSkillSchema,
	])
	.describe('Action definition stored in the skills table.');

export const newSkillSchema = z.union([
	thinkSkillSchema.omit({
		author: true,
		owner: true,
		source: true,
		root: true,
		sourceFile: true,
		sourcePath: true,
		sourceHash: true,
		compiledBy: true,
		compiledAt: true,
	}), //
	requestSkillSchema.omit({
		author: true,
		owner: true,
		source: true,
		root: true,
		sourceFile: true,
		sourcePath: true,
		sourceHash: true,
		compiledBy: true,
		compiledAt: true,
	}),
	executeSkillSchema.omit({
		author: true,
		owner: true,
		source: true,
		root: true,
		sourceFile: true,
		sourcePath: true,
		sourceHash: true,
		compiledBy: true,
		compiledAt: true,
	}),
]);
