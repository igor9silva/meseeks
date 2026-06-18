import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineInstinct } from 'lib/instinct';

const inputSchema = z.object({
	fileId: z.string().min(1),
	key: z.string().min(1),
});

const outputSchema = z.object({
	summary: z.string().optional(),
});

export const untag = defineInstinct({
	key: 'untag',
	description: 'Remove a file tag.',
	inputSchema,
	outputSchema,
	perform({ action, input, warnings }) {
		//
		const file = zid('files').parse(input.fileId);

		return {
			action: action._id,
			status: 'succeeded',
			fileMutations: [
				{
					kind: 'untag',
					file,
					key: input.key,
				},
			],
			warnings,
		};
	},
});
