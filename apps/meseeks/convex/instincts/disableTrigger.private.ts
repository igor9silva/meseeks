import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineInstinct } from 'lib/instinct';

const inputSchema = z.object({
	triggerId: z.string().min(1),
});

const outputSchema = z.object({
	summary: z.string().optional(),
});

export const disableTrigger = defineInstinct({
	key: 'disableTrigger',
	description: 'Disable a trigger.',
	inputSchema,
	outputSchema,
	perform({ action, input, warnings }) {
		//
		const trigger = zid('triggers').parse(input.triggerId);

		return {
			action: action._id,
			status: 'succeeded',
			triggerMutations: [
				{
					kind: 'disableTrigger',
					trigger,
				},
			],
			warnings,
		};
	},
});
