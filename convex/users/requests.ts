import { z } from 'zod';
import { mutation } from 'lib/convex';
import { userRequestKeySchema } from 'schemas/userSchema';
import { getCurrentUser } from '../users.private';
import { submitUserRequest } from './requests.private';

export const submit = mutation({
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
