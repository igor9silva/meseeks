import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';

export const fileRevisionChangeKindSchema = z.enum(['create', 'update', 'delete', 'rename', 'metadata', 'tag']);

export const fileRevisionSchema = z
	.object({
		owner: zid('users'),
		file: zid('files'),
		action: zid('actions'),
		previousRevision: zid('file_revisions').optional(),
		changeKind: fileRevisionChangeKindSchema,
		beforePath: z.string().optional(),
		afterPath: z.string().optional(),
		beforeHash: z.string().optional(),
		afterHash: z.string().optional(),
		beforeSize: z.number().int().min(0).optional(),
		afterSize: z.number().int().min(0).optional(),
		storageKey: z.string().optional(),
		contentType: z.string().optional(),
		patch: z.string().optional().describe('Full reversible patch for this file mutation.'),
		patchStorageKey: z.string().optional(),
	})
	.describe('Immutable record of one file mutation.');
