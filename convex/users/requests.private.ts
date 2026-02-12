import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { defineMutation } from 'lib/functions';
import { userRequestKeySchema } from 'schemas/userSchema';

export const submitRequest = defineMutation({
	args: z.object({
		owner: zid('users'),
		key: userRequestKeySchema,
		message: z.string().min(1).max(1000),
		context: z.record(z.unknown()).optional(),
	}),
	handler: async (ctx, request) => {
		//
		// // Check if a request with the same key already exists for this user
		// const existingRequest = await ctx.db
		// 	.query('user_requests')
		// 	.withIndex('by_owner_key', (q) => q.eq('owner', request.owner).eq('key', request.key))
		// 	.unique();

		// if (existingRequest) return;
		// TODO: for now we are purposefully allowing multiple requests with the same key

		console.warn('User requested:', request);

		return await ctx.db.insert('user_requests', request);
	},
});
