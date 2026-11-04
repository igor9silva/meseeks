import { z } from 'zod';
import { convexObjectSchema } from './convexValueSchema';

export const skillCallSchema = z.object({
	skillKey: z.string().describe('The key of the skill to use'),
	args: convexObjectSchema,
});

export const reactionSchema = skillCallSchema.extend({
	condition: z
		.enum([
			'owner', // only react if the author is the owner
			'companion', // only react if the author is an action
			'any', // always react
		])
		.optional(),
});
