import { z } from 'zod';
import { mutation } from 'lib/functions';
import { userRequestKeySchema } from 'schemas/userSchema';
import { getCurrentUser } from '../users.private';
import { submitRequest as submitUserRequest } from './requests.private';

export const submitRequest = mutation({
	args: {
		key: userRequestKeySchema,
		message: z.string().min(1).max(1000),
		context: z.record(z.unknown()).optional(),
	},
	handler: async (ctx, { key, message, context }) => {
		//
		const user = await getCurrentUser(ctx, {});
		return await submitUserRequest(ctx, {
			owner: user._id,
			key,
			message,
			context,
		});
	},
});
