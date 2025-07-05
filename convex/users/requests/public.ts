import { z } from 'zod';
import { mutation } from '../../lib';
import { userRequestKeySchema } from '../../schemas/userSchema';
import { current as getCurrentUser } from '../public';
import { _submitRequest } from './private';

export const submitRequest = mutation({
	args: {
		key: userRequestKeySchema,
		message: z.string().min(1).max(1000),
		context: z.record(z.any()).optional(),
	},
	handler: async (ctx, { key, message, context }) => {
		//
		const user = await getCurrentUser(ctx, {});

		return await _submitRequest(ctx, {
			owner: user._id,
			key,
			message,
			context,
		});
	},
});
