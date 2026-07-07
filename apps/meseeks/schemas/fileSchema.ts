import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';

export const fileKindSchema = z.enum(['directory', 'file']);
export const fileParentSchema = z.union([z.literal('root'), zid('files')]);

export const fileMetadataSchema = z.record(z.unknown());

export const fileBudgetSchema = z.object({
	energy: z.bigint(),
});

export const fileSchema = z
	.object({
		owner: zid('users'),
		parent: fileParentSchema,
		name: z.string(),
		kind: fileKindSchema,
		currentRevision: zid('file_revisions').optional(),
		contentType: z.string().optional(),
		size: z.number().int().min(0).optional(),
		hash: z.string().optional(),
		metadata: fileMetadataSchema.optional(),
		budget: fileBudgetSchema.optional(),
		author: authorSchema,
	})
	.describe('Stable identity and current state for a file or directory.');

export const fileTagSchema = z
	.object({
		owner: zid('users'),
		file: zid('files'),
		key: z.string().min(1),
		value: z.string().optional(),
	})
	.describe('Current tag index for files.');
