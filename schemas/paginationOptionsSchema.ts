import { z } from 'zod';

export const paginationOptionsSchema = z.object({
	numItems: z.number(),
	cursor: z.union([
		z.string(), //
		z.null(),
	]),
	endCursor: z
		.union([
			z.string(), //
			z.null(),
		])
		.optional(),
	id: z.number().optional(),
	maximumRowsRead: z.number().optional(),
	maximumBytesRead: z.number().optional(),
});
