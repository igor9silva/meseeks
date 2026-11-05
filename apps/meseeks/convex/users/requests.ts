import { mutation } from 'lib/convex';
import { userRequestSchema } from 'schemas/userSchema';
import { getCurrentUser } from '../users.private';
import { submitUserRequest } from './requests.private';

export const submit = mutation({
	args: userRequestSchema.omit({ owner: true }).shape,
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
