import type { Doc, Id } from '../_generated/dataModel';
import type { ActionCtx, MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';

export async function runAction(
	ctx: ActionCtx | MutationCtx,
	{
		taskId,
		action,
	}: {
		taskId: Id<'tasks'>;
		action: Doc<'actions'>;
	},
) {
	if (action.result) throw new Error('Action is already done.');

	// ideally, status=`running` would be set in the action itself, but that'd lead into a race condition
	await ctx.runMutation(internal.action.lifecycle._start, { actionId: action._id, taskId });

	return await ctx.scheduler.runAfter(0, internal.action.lifecycle._perform, {
		taskId,
		actionId: action._id,
	});
}

export async function runNextActionIfNeeded(
	ctx: ActionCtx | MutationCtx, //
	taskId: Id<'tasks'>,
) {
	//
	const skip = (message: string) => console.info(message);

	// skip if there are running actions
	const runningAction = await ctx.runQuery(internal.action._findRunning, { taskId });
	if (runningAction)
		return skip(
			`Skipping next action for task ${taskId} because there is a running action (${runningAction.skillKey}, ${runningAction._id}).`,
		);

	// skip if there is a pending authorization
	const pendingAuthorization = await ctx.runQuery(internal.action._findPendingAuthorization, { taskId });
	if (pendingAuthorization)
		return skip(
			`Skipping next action for task ${taskId} because there is a pending authorization action (${pendingAuthorization.skillKey}, ${pendingAuthorization._id}).`,
		);

	// grab next pending action, skip if there are none
	const nextAction = await ctx.runQuery(internal.action._findNext, { taskId });
	if (!nextAction) return skip(`Skipping next action for task ${taskId} because there are no more pending actions.`);

	return await runAction(ctx, {
		taskId,
		action: nextAction,
	});
}
