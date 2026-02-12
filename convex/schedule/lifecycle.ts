import { internalMutation } from 'lib/functions';
import { executeOneTime, executeRecurring } from './lifecycle.private';

export const _executeOneTime = internalMutation({
	args: executeOneTime.args.shape,
	handler: executeOneTime,
});

export const _executeRecurring = internalMutation({
	args: executeRecurring.args.shape,
	handler: executeRecurring,
});
