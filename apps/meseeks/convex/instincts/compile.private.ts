import { z } from 'zod/v3';
import { compilePreparedSources } from '../compile.private';
import { defineInstinct } from 'lib/instinct';

const inputSchema = z.object({});

const outputSchema = z.object({
	summary: z.string().optional(),
	content: z.string(),
	contentType: z.string().min(1).optional(),
});

export const compile = defineInstinct({
	key: 'compile',
	description: 'Compile file-authored runtime source into executable runtime state.',
	inputSchema,
	outputSchema,
	async perform({ action, preparation, warnings }, { stageText }) {
		//
		const result = await compilePreparedSources(preparation);
		const output = await stageText({
			owner: action.owner,
			content: result.content,
			contentType: 'text/mdx; charset=utf-8',
		});

		return {
			action: action._id,
			status: 'succeeded',
			output,
			compileMutations: [result.mutation],
			warnings,
		};
	},
});
