import { internalAction, internalMutation, mutation } from 'lib/convex';
import { zid } from 'convex-helpers/server/zod3';
import { performArgsSchema } from 'schemas/reactorSchema';
import { ensureScopeOwner } from './files.private';
import { getCurrentUser } from './users.private';
import { claimNextAction, loadForPerform, perform, settleAction } from './reactor.private';

export const claimNext = mutation({
	args: {
		root: zid('files'),
	},
	handler: async (ctx, { root }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const actionRoot = await ensureScopeOwner(ctx, {
			owner: currentUser._id,
			directory: root,
		});

		return await claimNextAction(ctx, {
			owner: currentUser._id,
			root: actionRoot._id,
		});
	},
});

// scheduled by root bootstrap after it enqueues the initial seed action; bootstrap lives in files, but seed must enter the normal Reactor claim path.
export const _claimNext = internalMutation({
	args: {
		owner: zid('users'),
		root: zid('files'),
	},
	handler: claimNextAction,
});

// called by _perform as its first Convex crossing to load a claimed action and move it to running.
export const _loadForPerform = internalMutation({
	args: loadForPerform.args.shape,
	handler: loadForPerform,
});

// called by perform as its final Convex crossing so canonical apply and action resolution happen atomically.
export const _settle = internalMutation({
	args: settleAction.args.shape,
	handler: settleAction,
});

// scheduled by claimNextAction because provider calls and Object Storage staging cannot run inside a mutation.
export const _perform = internalAction({
	args: performArgsSchema.shape,
	handler: perform,
});
