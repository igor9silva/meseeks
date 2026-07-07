import { z } from 'zod/v3';
import { defineMutation } from 'lib/convex';
import { polarEventReceiptSchema } from 'schemas/polarEventSchema';

export const recordPolarEvent = defineMutation({
	args: z.object({
		event: polarEventReceiptSchema.omit({ receivedAt: true }),
	}),
	handler: async (ctx, { event }) => {
		//
		return await ctx.db.insert('polar_events', {
			...event,
			receivedAt: Date.now(),
		});
	},
});
