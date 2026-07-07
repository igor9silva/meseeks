import { z } from 'zod/v3';
import { intelligenceKeys } from 'schemas/intelligenceSchema';
import { askMagicRock, magicRockPreparationSchema } from '../magicRock.private';
import { defineInstinct } from 'lib/instinct';

export const thinkInputSchema = z.object({
	prompt: z.string().min(1),
	intelligence: intelligenceKeys.optional(),
});

const outputSchema = z.object({
	summary: z.string().optional(),
	content: z.string(),
	contentType: z.string().min(1).optional(),
});

export const think = defineInstinct({
	key: 'think',
	description: 'Delegate a decision to a digital intelligence.',
	inputSchema: thinkInputSchema,
	outputSchema,
	async perform({ action, preparation, warnings }, { stageText }) {
		//
		const magicRock = magicRockPreparationSchema.parse(preparation);
		const result = await askMagicRock(magicRock);
		const output = await stageText({
			owner: action.owner,
			content: result.text,
			contentType: 'text/mdx; charset=utf-8',
		});

		return {
			action: action._id,
			status: 'succeeded',
			output,
			providerReceipt: {
				provider: result.provider,
				model: result.model,
				request: {
					prompt: magicRock.prompt,
					system: magicRock.system,
				},
				response: { outputLength: result.text.length },
				usage: result.usage,
			},
			warnings: warnings.concat(result.warnings),
		};
	},
});
