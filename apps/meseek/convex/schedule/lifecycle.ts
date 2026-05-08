import { internalMutation } from 'lib/convex';
import { executeOneTime, executeRecurring } from './lifecycle.private';

// scheduled by schedule/lifecycle.private.ts via ctx.scheduler.runAt for one-time schedules
export const _executeOneTime = internalMutation({
	args: executeOneTime.args.shape,
	handler: executeOneTime,
});

// scheduled by schedule/lifecycle.private.ts via ctx.scheduler.runAt for recurring schedules
export const _executeRecurring = internalMutation({
	args: executeRecurring.args.shape,
	handler: executeRecurring,
});
