import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import type { Doc } from '../_generated/dataModel';
import { internalAction, internalMutation, internalQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { asDollars } from 'lib/money';
import { newActionSchema, resolvedActionStatusSchema } from 'schemas/actionSchema';
import { builtInSkillSchema } from 'schemas/skillSchema';
import { tokenSchema } from 'schemas/topUpSchema';
import { addActions, findAction } from '../action.private';
import { findSkill } from '../skills.private';
import { findTask, setTaskStatus, useTaskFunds } from '../tasks.private';
import { perform } from './lifecycle.private';

// scheduled by runAction in action/lifecycle.private.ts to execute one action end-to-end (budget, approval, tool execution, resolve)
export const _perform = internalAction({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
	},
	// TODO: since we dropped support for sync actions, we could use ActionCtx only, and remove MutationCtx from the arg type
	handler: perform,
});

// called by perform in action/lifecycle.private.ts to load the task, action, and resolved skill before execution
export const _load = internalQuery({
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

// called by runAction in action/lifecycle.private.ts to transition action/task to running/acting before scheduling _perform
export const _start = internalMutation({
	args: {
		actionId: zid('actions'),
		taskId: zid('tasks'),
	},
	handler: async (ctx, { actionId, taskId }) => {
		//
		console.debug(`${actionId} starts`);

		await ctx.db.patch(actionId, { status: 'running' });
		await setTaskStatus(ctx, { taskId, newStatus: 'acting' }); // if any running action, task is 'acting'
	},
});

// called by _estimateAndPersistCost in action/lifecycle.private.ts so estimated cost is stored once and reused
export const _setEstimatedCost = internalMutation({
	args: {
		actionId: zid('actions'),
		estimatedCost: z.bigint(),
	},
	handler: async (ctx, { actionId, estimatedCost }) => {
		return await ctx.db.patch(actionId, { estimatedCost });
	},
});

// called by requestHumanApproval in action/lifecycle.private.ts when auto-approval fails and user input is required
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

// called by setResolved in action/lifecycle.private.ts to persist final result/costs and enqueue reaction actions
export const _resolve = internalMutation({
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
		console.debug(`${actionId} resolved with ${status}`);

		const action = await ctx.db.get(actionId);
		if (!action) throw NotFound();

		if (action.status === 'skipped') {
			//
			console.info(
				'INTERRUPTION',
				`_resolve(${actionId}, ${status}) result was ignored because status === 'skipped'. This should only happen as a consequence of an user stop() action.`,
				`skill key: ${action.skillKey}`,
			);

			// TODO: keep track of interruption costs

			return;
		}

		if (action.result) {
			throw new Error(`Action result already set for ${actionId}. Trying to set to ${JSON.stringify(result)}`);
		}

		if (!result) console.warn(`${action.skillKey} (${actionId}) ended with no result`);

		const totalCost = costs.reduce((acc, cost) => acc + cost.amount, 0n);

		console.debug(
			`Resolved as ${status} with ${result.text?.length} characters. Total cost: ${asDollars({ bigInt: totalCost, precision: 6 })}`,
		);

		if (status === 'succeeded' && totalCost > 0) {
			await useTaskFunds(ctx, { taskId: action.taskId, amount: totalCost });
		}

		await ctx.db.patch(actionId, { result, status, costs });

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
				skills: result.reactions.map((reaction) => ({
					skillKey: reaction.skillKey,
					args: reaction.args,
				})),
			});
		}
	},
});
