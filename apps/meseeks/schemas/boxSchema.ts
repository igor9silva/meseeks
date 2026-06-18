import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';

export const boxStatusSchema = z.enum([
	'creating', //
	'ready',
	'busy',
	'stopped',
	'failed',
]);

export const boxSchema = z
	.object({
		owner: zid('users'),
		root: zid('files'),
		provider: z.literal('daytona'),
		providerBoxId: z.string().min(1),
		status: boxStatusSchema,
		lastAction: zid('actions').optional(),
		lastStartedAt: z.number().optional(),
		lastStoppedAt: z.number().optional(),
		metadata: z.record(z.unknown()).optional(),
	})
	.describe('Compute provider lifecycle metadata.');
