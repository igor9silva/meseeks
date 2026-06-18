import { z } from 'zod/v3';
import { performRequest, requestPreparationSchema } from '../request.private';
import { defineInstinct } from 'lib/instinct';

const inputSchema = z.object({
	url: z.string().url(),
	method: z
		.enum([
			'GET', //
			'POST',
			'PUT',
			'PATCH',
			'DELETE',
		])
		.optional()
		.default('GET'),
	headers: z.record(z.string()).optional(),
	body: z.unknown().optional(),
});

const outputSchema = z.object({
	summary: z.string().optional(),
	content: z.string(),
	contentType: z.string().min(1).optional(),
});

export const request = defineInstinct({
	key: 'request',
	description: 'Make an HTTP request.',
	inputSchema,
	outputSchema,
	async perform({ action, preparation, warnings }, { stageText }) {
		//
		return await performRequest({
			action,
			preparation: requestPreparationSchema.parse(preparation),
			stageText,
			warnings,
		});
	},
});
