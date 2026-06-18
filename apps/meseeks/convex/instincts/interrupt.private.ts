import { z } from 'zod/v3';
import { defineInstinct } from 'lib/instinct';

const inputSchema = z.object({
	actionId: z.string().min(1),
	reason: z.string().optional(),
});

const outputSchema = z.object({
	summary: z.string().optional(),
});

export const interrupt = defineInstinct({
	key: 'interrupt',
	description: 'Interrupt a running action.',
	inputSchema,
	outputSchema,
	perform({ action, input, warnings }) {
		//
		return {
			action: action._id,
			status: 'skipped',
			warnings: input.reason ? warnings.concat(input.reason) : warnings,
		};
	},
});
