import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';
import { intelligenceKeys } from './intelligenceSchema';

export const skillKindSchema = z.enum(['instinct', 'think', 'request', 'execute']);

export const storedSkillKindSchema = skillKindSchema.exclude(['instinct']);

export const skillInputArgumentTypeSchema = z.enum([
	'string', //
	'number',
	'integer',
	'boolean',
	'bigint',
	'file',
	'json',
]);

export const skillInputArgumentSchema = z.object({
	key: z.string().min(1),
	type: skillInputArgumentTypeSchema,
	required: z.boolean(),
	description: z.string().default(''),
});

export type SkillInputArgument = z.input<typeof skillInputArgumentSchema>;

const coreSkillSchema = z.object({
	owner: zid('users'),
	key: z.string().min(1),
	name: z.string().min(1),
	description: z.string().default(''),
	input: z.array(skillInputArgumentSchema).optional(),
	isPublic: z.boolean().optional(),
	sourceOwner: zid('users').optional(),
	sourceKey: z.string().min(1).optional(),
	sourceFile: zid('files').optional(),
	author: authorSchema,
	createdAt: z.number(),
	updatedAt: z.number(),
});

export const thinkSkillSchema = coreSkillSchema.extend({
	kind: z.literal('think'),
	file: zid('files'),
	intelligence: z.union([z.literal('auto'), intelligenceKeys]).default('auto'),
	temperature: z.number().min(0).max(2).optional(),
	toolPolicy: z
		.object({
			skillKeys: z.array(z.string().min(1)).default([]),
			includeFileSkills: z.boolean().default(true),
		})
		.optional(),
});

export const requestHeaderSchema = z.union([
	z.object({
		kind: z.literal('literal'),
		name: z.string().min(1),
		value: z.string(),
	}),
	z.object({
		kind: z.literal('env'),
		name: z.string().min(1),
		env: z.string().min(1),
	}),
]);

export const requestSkillSchema = coreSkillSchema.extend({
	kind: z.literal('request'),
	file: zid('files'),
	method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
	url: z.string().min(1),
	headers: z.array(requestHeaderSchema).default([]),
});

export const executeSkillSchema = coreSkillSchema.extend({
	kind: z.literal('execute'),
	file: zid('files'),
	command: z.string().min(1),
	timeoutMs: z.number().int().positive().optional(),
	env: z.record(z.string()).optional(),
});

export const skillSchema = z.union([thinkSkillSchema, requestSkillSchema, executeSkillSchema]);
