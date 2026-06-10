import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { authorSchema } from './authorSchema';

export const fileBudgetSchema = z.object({
	total: z.bigint(),
	available: z.bigint(),
	reserved: z.bigint(),
	spent: z.bigint(),
});

export const textContentPointerSchema = z.object({
	kind: z.literal('text'),
	content: zid('file_contents'),
});

export const objectContentPointerSchema = z.object({
	kind: z.literal('object'),
	storageKey: z.string().min(1),
	size: z.number().int().nonnegative(),
	contentType: z.string().min(1).optional(),
});

export const contentPointerSchema = z.union([textContentPointerSchema, objectContentPointerSchema]);

export const sourceFileSchema = z.object({
	sourceOwner: zid('users').optional(),
	sourceKey: z.string().min(1).optional(),
	sourceFile: zid('files').optional(),
});

export const fileSchema = z
	.object({
		owner: zid('users'),
		parent: zid('files').optional(),
		name: z.string().min(1),
		author: authorSchema,
		provider: z.string().min(1).optional(),
		providerReference: z.string().min(1).optional(),
		currentContent: contentPointerSchema.optional(),
		budget: fileBudgetSchema.optional(),
		isPublic: z.boolean().optional(),
		createdAt: z.number(),
		updatedAt: z.number(),
	})
	.merge(sourceFileSchema);

export const fileContentSchema = z.object({
	owner: zid('users'),
	file: zid('files'),
	author: authorSchema,
	text: z.string(),
	createdAt: z.number(),
});
