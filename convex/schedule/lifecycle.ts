import { internalMutation } from 'lib/functions';
import { executeOneTime, executeRecurring } from './lifecycle.private';

export const _executeOneTime = internalMutation({
	args: executeOneTime.args.shape,
	handler: async (ctx, args) => {
		//
		await executeOneTime(ctx, args);
	},
});

export const _executeRecurring = internalMutation({
	args: executeRecurring.args.shape,
	handler: async (ctx, args) => {
		//
		await executeRecurring(ctx, args);
	},
});
