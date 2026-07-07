import { z } from 'zod/v3';
import { executePreparationSchema, performExecute } from '../execute.private';
import { defineInstinct } from 'lib/instinct';

export const executeInputSchema = z.object({
	code: z.string().min(1).max(10_000),
	language: z
		.enum([
			'javascript', //
			'python',
		])
		.default('javascript'),
});

const outputSchema = z.object({
	summary: z.string().optional(),
	content: z.string(),
	contentType: z.string().min(1).optional(),
});

export const execute = defineInstinct({
	key: 'execute',
	description: 'Run code in an execution box.',
	inputSchema: executeInputSchema,
	outputSchema,
	async perform({ action, preparation, warnings }, { stageText }) {
		//
		return await performExecute({
			action,
			preparation: executePreparationSchema.parse(preparation),
			stageText,
			warnings,
		});
	},
});
