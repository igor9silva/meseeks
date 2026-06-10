import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';

export const skillKindSchema = z.enum(['instinct', 'soft', 'code']);

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

export const skillSchema = z.object({
	owner: zid('users'),
	key: z.string().min(1),
	name: z.string().min(1),
	description: z.string().default(''),
	kind: storedSkillKindSchema,
	input: z.array(skillInputArgumentSchema).optional(),
	file: zid('files'),
	isPublic: z.boolean().optional(),
	sourceOwner: zid('users').optional(),
	sourceKey: z.string().min(1).optional(),
	sourceFile: zid('files').optional(),
	author: authorSchema,
	createdAt: z.number(),
	updatedAt: z.number(),
});
