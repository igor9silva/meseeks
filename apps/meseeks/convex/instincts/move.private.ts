import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineInstinct } from 'lib/instinct';

const inputSchema = z.object({
	fileId: z.string().min(1),
	parentId: z.string().min(1).optional(),
	name: z.string().min(1).optional(),
});

const outputSchema = z.object({
	summary: z.string().optional(),
});

export const move = defineInstinct({
	key: 'move',
	description: 'Move a file or directory, including renames.',
	inputSchema,
	outputSchema,
	perform({ action, input, warnings }) {
		//
		const file = zid('files').parse(input.fileId);
		const parent = input.parentId ? zid('files').parse(input.parentId) : undefined;

		return {
			action: action._id,
			status: 'succeeded',
			fileMutations: [
				{
					kind: 'move',
					file,
					parent,
					name: input.name,
				},
			],
			warnings,
		};
	},
});
