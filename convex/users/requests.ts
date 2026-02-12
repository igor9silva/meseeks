import { z } from 'zod';
import { internalMutation, mutation } from 'lib/functions';
import { userRequestKeySchema } from 'schemas/userSchema';
import { current } from '../users.private';
import { submitRequest as submitUserRequest } from './requests.private';

export const _submitRequest = internalMutation({
	args: submitUserRequest.args.shape,
	handler: async (ctx, args) => {
		//
		return await submitUserRequest(ctx, args);
	},
});

export const submitRequest = mutation({
	args: {
		key: userRequestKeySchema,
		message: z.string().min(1).max(1000),
		context: z.record(z.unknown()).optional(),
	},
	handler: async (ctx, { key, message, context }) => {
		//
		const user = await current(ctx, {});
		return await submitUserRequest(ctx, {
			owner: user._id,
			key,
			message,
			context,
		});
	},
});
