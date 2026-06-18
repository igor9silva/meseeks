import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';

export const transactionKindSchema = z.enum(['free energy', 'top up', 'action cost', 'storage cost', 'refund']);

export const transactionSchema = z
	.object({
		owner: zid('users'),
		kind: transactionKindSchema,
		value: z.bigint(),
		action: zid('actions').optional(),
		file: zid('files').optional(),
		topUp: zid('top_ups').optional(),
		description: z.string().optional(),
	})
	.describe('Energy ledger transaction.');
