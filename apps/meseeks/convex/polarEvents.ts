import { internalMutation } from 'lib/convex';
import { recordPolarEvent } from './polarEvents.private';

// called by the Polar webhook HTTP action to persist webhook receipts before branching on event type
export const _recordPolarEvent = internalMutation({
	args: recordPolarEvent.args.shape,
	handler: recordPolarEvent,
});
