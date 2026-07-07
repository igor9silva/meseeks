import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { skillOwnerSchema } from './skillSchema';

export const pageSchema = z
	.object({
		owner: skillOwnerSchema,
		root: zid('files'),
		file: zid('files'),
		route: z.string().min(1),
		sourcePath: z.string().min(1),
		sourceHash: z.string().optional(),
		compiledBy: zid('actions'),
		compiledAt: z.number(),
		status: z.enum([
			'enabled', //
			'disabled',
			'errored',
		]),
		diagnostics: z.array(z.string()).optional(),
	})
	.describe('Compiled page projection.');
