import { z } from 'zod/v3';
import { defineInstinct } from 'lib/instinct';

const inputSchema = z.object({
	message: z.string().default(''),
});

const outputSchema = z.object({
	summary: z.string().optional(),
	content: z.string(),
	contentType: z.string().min(1).optional(),
});

export const say = defineInstinct({
	key: 'say',
	description: 'Record a message.',
	inputSchema,
	outputSchema,
	async perform({ action, input, warnings }, { stageText }) {
		//
		const output = await stageText({
			owner: action.owner,
			content: input.message || 'Said.',
			contentType: 'text/mdx; charset=utf-8',
		});

		return {
			action: action._id,
			status: 'succeeded',
			output,
			warnings,
		};
	},
});
