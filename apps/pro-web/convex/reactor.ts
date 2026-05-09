import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { internalAction, internalMutation } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { asDollars } from 'lib/money';
import { newActionSchema, resolvedActionStatusSchema } from 'schemas/actionSchema';
import { builtInSkillSchema } from 'schemas/skillSchema';
import { tokenSchema } from 'schemas/topUpSchema';
import { addActions, findAction, findBlockedAction, findNextAction, findRunningAction } from './action.private';
import { findSkill } from './skills.private';
import { findTask, setTaskStatus, spendTaskEnergy } from './tasks.private';
import { findUser } from './users.private';
import { perform } from './reactor.private';
import { reserveEnergy, settleAction } from './reactor.accounting';
import {
	canAuthorize,
	canSpendTaskEnergy,
	findRequiredActionDetails,
	hasAccountEnergy,
	prepare,
} from './reactor.preflight';
import { createReactions } from 'skills/createReactions';

// scheduled by claimNext to execute one reserved action end-to-end
export const _perform = internalAction({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
	},
	returns: z.null(),
	handler: perform,
});

// called by perform when the scheduled function actually starts executing
export const _start = internalMutation({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
	},
	handler: async (ctx, { taskId, actionId }) => {
		//
		const action = await findAction(ctx, { actionId });
		if (action.taskId !== taskId) return null;
		if (action.status !== 'running') return null;
		if ('startedAt' in action) return null;

		const startedAt = Date.now();

		await ctx.db.patch(actionId, { startedAt });

		const task = await findTask(ctx, { taskId });
		const skill = await findSkill(ctx, {
			key: action.skillKey,
			owner: task.owner,
		});

		const startedAction = { ...action, startedAt };
		const actionDetails = await findRequiredActionDetails(ctx, { action: startedAction, skill });

		return {
			task,
			action: startedAction,
			skill,
			actionDetails,
		};
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
	handler: claimNext,
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
		status: resolvedActionStatusSchema,
		costs: z.array(
			z.object({
				symbol: tokenSchema,
				amount: z.bigint(),
				description: z.string(),
			}),
		),
	},
	handler: finish,
});

async function claimNext(
	ctx: MutationCtx,
	{ taskId }: { taskId: Doc<'tasks'>['_id'] },
): Promise<{
	actionId: Id<'actions'>;
	scheduledFunctionId: Id<'_scheduled_functions'>;
} | null> {
	//
	const runningAction = await findRunningAction(ctx, { taskId });
	if (runningAction) {
		console.info(
			`Skipping next action for task ${taskId} because ${runningAction.skillKey} (${runningAction._id}) is running.`,
		);
		return null;
	}

	const blockedAction = await findBlockedAction(ctx, { taskId });
	if (blockedAction) {
		console.info(
			`Skipping next action for task ${taskId} because ${blockedAction.skillKey} (${blockedAction._id}) is blocked.`,
		);
		return null;
	}

	const action = await findNextAction(ctx, { taskId });
	if (!action) {
		console.info(`Skipping next action for task ${taskId} because there are no enqueued actions.`);
		return null;
	}

	const task = await findTask(ctx, { taskId });
	const skill = await findSkill(ctx, {
		key: action.skillKey,
		owner: task.owner,
	});

	const { maxCost, estimatedCost } = await prepare(ctx, { task, action, skill });

	if (!canSpendTaskEnergy({ task, maxCost })) {
		await fail(ctx, {
			action,
			task,
			result: {
				text: `This task needs more energy to run ${action.skillKey}. Required: ${asDollars({ bigInt: maxCost, precision: 6 })}.`,
				reactions: createReactions(action, [
					{
						skillKey: 'requestBudget',
						args: {
							maxCost,
							previousActionKey: action.skillKey,
						},
					},
				]),
			},
		});

		return await claimNext(ctx, { taskId });
	}

	const user = await findUser(ctx, { userId: task.owner });
	if (!user) throw NotFound();

	if (!hasAccountEnergy({ user, estimatedCost })) {
		await fail(ctx, {
			action,
			task,
			result: {
				text: `Your account needs ${asDollars({ bigInt: estimatedCost, precision: 6 })} to run ${action.skillKey}.`,
				reactions: [],
			},
		});

		return await claimNext(ctx, { taskId });
	}

	if (!(await canAuthorize(ctx, { task, action, skill, maxCost }))) {
		await requestAuthorization(ctx, { action, task });
		return null;
	}

	const autoApprover = 'auto';
	const runningStatus = 'running';
	const reservation = await reserveEnergy(ctx, { action, amount: estimatedCost });

	const scheduledFunctionId: Id<'_scheduled_functions'> = await ctx.scheduler.runAfter(0, internal.reactor._perform, {
		taskId,
		actionId: action._id,
	});

	const claimedAt = Date.now();

	console.debug(`${action._id} starts as scheduled function ${scheduledFunctionId}`);

	if ('approvedAt' in action) {
		await ctx.db.patch(action._id, {
			...reservation,
			status: runningStatus,
			claimedAt,
			scheduledFunctionId,
		});
	} else {
		await ctx.db.patch(action._id, {
			...reservation,
			status: runningStatus,
			approvedAt: Date.now(),
			approvedBy: autoApprover,
			claimedAt,
			scheduledFunctionId,
		});
	}
	await setTaskStatus(ctx, { taskId, newStatus: 'acting' });

	return {
		actionId: action._id,
		scheduledFunctionId,
	};
}

async function requestAuthorization(
	ctx: MutationCtx,
	{
		action,
		task,
	}: {
		action: Doc<'actions'>;
		task: Doc<'tasks'>;
	},
) {
	//
	console.debug(`requesting authorization for ${action._id}`);

	await ctx.db.patch(action._id, { status: 'blocked' });
	await setTaskStatus(ctx, { taskId: task._id, newStatus: 'blocked' });
}

async function fail(
	ctx: MutationCtx,
	{
		action,
		task,
		result,
	}: {
		action: Doc<'actions'>;
		task: Doc<'tasks'>;
		result: {
			text?: string;
			reactions: Array<z.infer<typeof newActionSchema>>;
		};
	},
) {
	//
	await finish(ctx, {
		actionId: action._id,
		taskId: task._id,
		status: 'failed',
		costs: [],
		result,
	});
}

async function finish(
	ctx: MutationCtx,
	{
		actionId,
		taskId,
		result,
		status,
		costs,
	}: {
		actionId: Doc<'actions'>['_id'];
		taskId: Doc<'tasks'>['_id'];
		result: {
			text?: string;
			reactions: Array<z.infer<typeof newActionSchema>>;
		};
		status: z.infer<typeof resolvedActionStatusSchema>;
		costs: Array<{
			symbol: z.infer<typeof tokenSchema>;
			amount: bigint;
			description: string;
		}>;
	},
) {
	//
	console.debug(`${actionId} finished with ${status}`);

	const action = await ctx.db.get(actionId);
	if (!action) throw NotFound();

	if (action.result) {
		throw new Error(`Action result already set for ${actionId}. Trying to set to ${JSON.stringify(result)}`);
	}

	const resultToStore = addFailureContextIfNeeded({ action, result, status });
	const totalCost = costs.reduce((acc, cost) => acc + cost.amount, 0n);
	const isInterrupted = 'interruptedAt' in action;

	console.debug(
		`Finished as ${status} with ${resultToStore.text?.length} characters. Total cost: ${asDollars({ bigInt: totalCost, precision: 6 })}`,
	);

	const settlement = await settleAction(ctx, { action, costs });

	if (totalCost > 0n) {
		await spendTaskEnergy(ctx, { taskId: action.taskId, amount: totalCost });
	}

	await ctx.db.patch(actionId, {
		...settlement,
		result: resultToStore,
		status,
		costs,
		finishedAt: Date.now(),
	});

	const task = await ctx.db.get(taskId);
	if (!task?.isActive) return;

	if (isInterrupted || status === 'skipped') {
		await setTaskStatus(ctx, { taskId, newStatus: 'idle' });
		return;
	}

	await setTaskStatus(ctx, { taskId, newStatus: 'unread' });
	await react(ctx, { task, action, result: resultToStore });
}

async function react(
	ctx: MutationCtx,
	{
		task,
		action,
		result,
	}: {
		task: Doc<'tasks'>;
		action: Doc<'actions'>;
		result: {
			text?: string;
			reactions: Array<z.infer<typeof newActionSchema>>;
		};
	},
) {
	//
	if (result.reactions.length === 0) return;

	await addActions(ctx, {
		taskId: task._id,
		owner: task.owner,
		author: action._id,
		depth: action.depth + 1,
		skills: result.reactions.map((reaction) => ({
			skillKey: reaction.skillKey,
			args: reaction.args,
		})),
		shouldRunNextAction: false,
	});
}

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
	status: z.infer<typeof resolvedActionStatusSchema>;
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
