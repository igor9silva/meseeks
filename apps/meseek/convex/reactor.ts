import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Doc, Id } from './_generated/dataModel';
import { internal } from './_generated/api';
import { internalAction, internalMutation, internalQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { asDollars } from 'lib/money';
import { newActionSchema, resolvedActionStatusSchema } from 'schemas/actionSchema';
import { builtInSkillSchema } from 'schemas/skillSchema';
import { tokenSchema } from 'schemas/topUpSchema';
import {
	addActions,
	findAction,
	findNextAction,
	findPendingAuthorizationAction,
	findRunningAction,
} from './action.private';
import { findSkill } from './skills.private';
import { findTask, setTaskStatus, spendTaskFunds } from './tasks.private';
import { perform } from './reactor.private';

// scheduled by _claimAndScheduleNext to execute one claimed action end-to-end
export const _perform = internalAction({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
	},
	returns: z.null(),
	// TODO: since we dropped support for sync actions, we could use ActionCtx only, and remove MutationCtx from the arg type
	handler: perform,
});

// called by reactor runtime to load the task, action, and resolved skill before execution
export const _prepare = internalQuery({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
	},
	handler: async (
		ctx,
		{ taskId, actionId },
	): Promise<{
		task: Doc<'tasks'>;
		action: Doc<'actions'>;
		skill: Doc<'skills'> | z.infer<typeof builtInSkillSchema>;
	}> => {
		//
		const [task, action] = await Promise.all([
			findTask(ctx, { taskId }), //
			findAction(ctx, { actionId }),
		]);

		const skill = await findSkill(ctx, {
			key: action.skillKey,
			owner: task.owner,
		});

		return { task, action, skill };
	},
});

// called after action creation, authorization, or finish to atomically reserve the next execution slot
export const _claimAndScheduleNext = internalMutation({
	args: {
		taskId: zid('tasks'),
	},
	returns: z
		.object({
			actionId: zid('actions'),
			scheduledFunctionId: zid('_scheduled_functions'),
		})
		.nullable(),
	handler: async (ctx, { taskId }) => {
		//
		const skip = (message: string) => {
			//
			console.info(message);
			return null;
		};

		const runningAction = await findRunningAction(ctx, { taskId });
		if (runningAction)
			return skip(
				`Skipping next action for task ${taskId} because there is a running action (${runningAction.skillKey}, ${runningAction._id}).`,
			);

		const pendingAuthorization = await findPendingAuthorizationAction(ctx, { taskId });
		if (pendingAuthorization)
			return skip(
				`Skipping next action for task ${taskId} because there is a pending authorization action (${pendingAuthorization.skillKey}, ${pendingAuthorization._id}).`,
			);

		const nextAction = await findNextAction(ctx, { taskId });
		if (!nextAction)
			return skip(`Skipping next action for task ${taskId} because there are no more pending actions.`);

		// generated function references form the reactor loop, so pin the scheduler result at the boundary
		const scheduledFunctionId: Id<'_scheduled_functions'> = await ctx.scheduler.runAfter(
			0,
			internal.reactor._perform,
			{
				taskId,
				actionId: nextAction._id,
			},
		);

		console.debug(`${nextAction._id} starts as scheduled function ${scheduledFunctionId}`);

		await ctx.db.patch(nextAction._id, {
			status: 'running',
			startedAt: Date.now(),
			scheduledFunctionId,
		});
		await setTaskStatus(ctx, { taskId, newStatus: 'acting' }); // if any running action, task is 'acting'

		return {
			actionId: nextAction._id,
			scheduledFunctionId,
		};
	},
});

// called by reactor runtime so estimated cost is stored once and reused
export const _setEstimatedCost = internalMutation({
	args: {
		actionId: zid('actions'),
		estimatedCost: z.bigint(),
	},
	handler: async (ctx, { actionId, estimatedCost }) => {
		return await ctx.db.patch(actionId, { estimatedCost });
	},
});

// called by reactor runtime when auto-approval fails and user input is required
export const _requestAuthorization = internalMutation({
	args: {
		actionId: zid('actions'),
		taskId: zid('tasks'),
	},
	handler: async (ctx, { actionId, taskId }) => {
		//
		console.debug(`requesting authorization for ${actionId}`);

		await ctx.db.patch(actionId, { status: 'pending authorization' });
		await setTaskStatus(ctx, { taskId, newStatus: 'blocked' }); // if any pending authorization action, task is 'blocked'
	},
});

// called by reactor runtime to persist final result/costs and enqueue reaction actions
export const _finish = internalMutation({
	args: {
		actionId: zid('actions'),
		taskId: zid('tasks'),
		result: z.object({
			text: z.string().optional(),
			reactions: z.array(newActionSchema),
		}),
		status: resolvedActionStatusSchema.exclude(['skipped']),
		costs: z.array(
			z.object({
				symbol: tokenSchema,
				amount: z.bigint(),
				description: z.string(),
			}),
		),
	},
	handler: async (ctx, { actionId, taskId, result, status, costs }) => {
		//
		console.debug(`${actionId} finished with ${status}`);

		const action = await ctx.db.get(actionId);
		if (!action) throw NotFound();

		if (action.status === 'skipped') {
			//
			console.info(
				'INTERRUPTION',
				`_finish(${actionId}, ${status}) result was ignored because status === 'skipped'. This should only happen as a consequence of an user stop() action.`,
				`skill key: ${action.skillKey}`,
			);

			// TODO: keep track of interruption costs

			return;
		}

		if (action.result) {
			throw new Error(`Action result already set for ${actionId}. Trying to set to ${JSON.stringify(result)}`);
		}

		const resultToStore = addFailureContextIfNeeded({ action, result, status });

		const totalCost = costs.reduce((acc, cost) => acc + cost.amount, 0n);

		console.debug(
			`Finished as ${status} with ${resultToStore.text?.length} characters. Total cost: ${asDollars({ bigInt: totalCost, precision: 6 })}`,
		);

		if (status === 'succeeded' && totalCost > 0) {
			await spendTaskFunds(ctx, { taskId: action.taskId, amount: totalCost });
		}

		await ctx.db.patch(actionId, { result: resultToStore, status, costs });

		const task = await ctx.db.get(taskId);

		if (task?.isActive) {
			//
			await setTaskStatus(ctx, { taskId, newStatus: 'unread' });

			// schedule all reactions
			await addActions(ctx, {
				taskId,
				owner: task.owner,
				author: action._id,
				depth: action.depth + 1,
				skills: resultToStore.reactions.map((reaction) => ({
					skillKey: reaction.skillKey,
					args: reaction.args,
				})),
			});
		}
	},
});

function addFailureContextIfNeeded({
	action,
	result,
	status,
}: {
	action: Doc<'actions'>;
	result: {
		text?: string | undefined;
		reactions: Array<z.infer<typeof newActionSchema>>;
	};
	status: 'succeeded' | 'failed';
}) {
	//
	if (status !== 'failed') return result;
	if (result.text?.trim()) return result;

	return {
		...result,
		text: [
			`Action ${action._id} (${action.skillKey}) failed without an error message.`,
			`Task: ${action.taskId}.`,
			`Previous status: ${action.status}.`,
			`Age: ${Math.round((Date.now() - action._creationTime) / 1000)} seconds.`,
		].join(' '),
	};
}
