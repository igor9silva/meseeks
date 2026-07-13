import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { actionResultSchema, actionWarningSchema, costSchema } from './actionSchema';

export const actionDetailSchema = z.object({
	action: zid('actions'),
	skill: zid('skills').optional(),
	skillFile: zid('files').optional(),
	loop: zid('loops').optional(),
	provider: z.string().min(1).optional(),
	model: z.string().min(1).optional(),
	instructions: z.string().optional(),
	input: z.unknown().optional(),
	output: z.unknown().optional(),
	usage: z.unknown().optional(),
	result: actionResultSchema.optional(),
	costs: z.array(costSchema).default([]),
	warnings: z.array(actionWarningSchema).optional(),
	patch: z.string().optional(),
	createdAt: z.number(),
	updatedAt: z.number(),
});
