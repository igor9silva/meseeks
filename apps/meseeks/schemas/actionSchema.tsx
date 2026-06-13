import { z } from 'zod/v3';

export const actionStatusSchema = z.enum([
	'pending authorization',
	'pending',
	'running',
	'succeeded',
	'failed',
	'skipped',
]);

export const pendingActionStatusSchema = actionStatusSchema.extract(['pending authorization', 'pending']);

export const newActionSchema = z.object({
	skillKey: z.string().min(1),
	args: z.record(z.unknown()).default({}),
	taskId: z.string().optional(),
	author: z.string().optional(),
	owner: z.string().optional(),
	depth: z.number().int().nonnegative().default(0),
});

export const actionSchema = newActionSchema.extend({
	status: actionStatusSchema,
	result: z.unknown().optional(),
	error: z.string().optional(),
});
