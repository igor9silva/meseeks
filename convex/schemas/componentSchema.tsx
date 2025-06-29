import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
// import { authorSchema } from './authorSchema';

export const componentSchema = z.object({
	owner: z.union([
		zid('users'), //
		z.literal('isPro'),
	]),
	// author: authorSchema,
	body: z.string().max(1000).describe('MDX'),
	defaultTaskId: zid('tasks').optional(),
	slug: z
		.string()
		.optional()
		.describe(
			'The slug of the component, used to identify it in the URL. If undefined, the component cannot be accessed directly via URL.',
		),
});
