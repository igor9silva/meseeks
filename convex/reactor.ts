import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { internalAction, internalMutation } from 'lib/convex';
import { INSUFFICIENT_ACCOUNT_FUNDS_ERROR, isError, NotFound } from 'lib/errors';
import { asDollars } from 'lib/money';
import { newActionSchema, resolvedActionStatusSchema } from 'schemas/actionSchema';
import { builtInSkillSchema } from 'schemas/skillSchema';
import { tokenSchema } from 'schemas/topUpSchema';
import {
	addActions,
	findAction,
	findBlockedAction,
	findLastActions,
	findNextAction,
	findRunningAction,
} from './action.private';
import { findSkill } from './skills.private';
import { findTask, setTaskStatus, spendTaskEnergy } from './tasks.private';
import { ACTION_TIMEOUT_MS, isInterrupted, isStarted, perform } from './reactor.private';
import { canSpendEnergy, reserveEnergy, settleAction } from './reactor.accounting';
import { findDetails, prepare } from './reactor.preflight';
import { env } from 'schemas/envSchema';
import { createReactions } from 'skills/createReactions';

// scheduled by _claimNext to execute one reserved action end-to-end
export const _perform = internalAction({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
	},
	returns: z.null(),
	// TODO: since we dropped support for sync actions, we could use ActionCtx only, and remove MutationCtx from the arg type
	handler: perform,
});

// called by reactor runtime to atomically mark a reserved action as started
export const _start = internalMutation({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
	},
	handler: async (ctx, { taskId, actionId }) => {
		//
		const action = await findAction(ctx, { actionId });

		if (action.taskId !== taskId) {
			console.warn(`Skipping stale reactor start for ${actionId}; task mismatch.`);
			return null;
		}

		if (action.status !== 'running') {
			console.info(`Skipping stale reactor start for ${actionId}; status is ${action.status}.`);
			return null;
		}

		if (isStarted(action)) {
			console.info(`Skipping stale reactor start for ${actionId}; current claim already started.`);
			return null;
		}

		const startedAt = Date.now();

		await ctx.db.patch(actionId, {
			startedAt,
		});

		const task = await findTask(ctx, { taskId });

		const skill = await findSkill(ctx, {
			key: action.skillKey,
			owner: task.owner,
		});
		const startedAction = { ...action, startedAt };
		const actionDetails = await findDetails(ctx, { action: startedAction, skill });

		return {
			task,
			action: startedAction,
			skill,
			actionDetails,
		};
	},
});

// called after action creation, authorization, or finish to atomically reserve the next execution slot
export const _claimNext = internalMutation({
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
		const action = await findActionToClaim(ctx, { taskId });
		if (!action) return null;

		const claim = await prepareClaim(ctx, { taskId, action });
		const isReserved = await reserveClaim(ctx, claim);
		if (!isReserved) return null;

		const scheduledFunctionId = await schedulePerform(ctx, claim);

		await markClaimRunning(ctx, {
			claim,
			scheduledFunctionId,
		});

		return {
			actionId: action._id,
			scheduledFunctionId,
		};
	},
});

async function findActionToClaim(
	ctx: MutationCtx,
	{
		taskId,
	}: {
		taskId: Id<'tasks'>;
	},
) {
	//
	const runningAction = await findRunningAction(ctx, { taskId });
	if (runningAction) {
		return skipClaim(
			`Skipping next action for task ${taskId} because there is a running action (${runningAction.skillKey}, ${runningAction._id}).`,
		);
	}

	const action = await findNextAction(ctx, { taskId });
	const blockedAction = await findBlockedAction(ctx, { taskId });
	if (blockedAction && (!action || blockedAction.depth <= action.depth)) {
		return skipClaim(
			`Skipping next action for task ${taskId} because there is a blocked action (${blockedAction.skillKey}, ${blockedAction._id}).`,
		);
	}

	if (!action) {
		return skipClaim(`Skipping next action for task ${taskId} because there are no more pending actions.`);
	}

	return action;
}

async function prepareClaim(
	ctx: MutationCtx,
	{
		taskId,
		action,
	}: {
		taskId: Id<'tasks'>;
		action: Doc<'actions'>;
	},
) {
	//
	const task = await findTask(ctx, { taskId });
	const skill = await findSkill(ctx, { key: action.skillKey, owner: task.owner });
	const maxCost = await prepare(ctx, {
		task,
		action,
		skill,
		timeoutMs: ACTION_TIMEOUT_MS,
	});

	await ctx.db.patch(action._id, { maxCost });

	return {
		task,
		action,
		skill,
		maxCost,
	};
}

async function reserveClaim(
	ctx: MutationCtx,
	{
		task,
		action,
		skill,
		maxCost,
	}: {
		task: Doc<'tasks'>;
		action: Doc<'actions'>;
		skill: Doc<'skills'> | z.infer<typeof builtInSkillSchema>;
		maxCost: bigint;
	},
) {
	//
	if (
		!canSpendEnergy({
			budget: task.energyBudget,
			amount: maxCost,
			bufferPercent: env.COST_PREDICTION_MARGIN,
		})
	) {
		await fail(ctx, {
			action,
			reason: `${action.skillKey} needs ${asDollars({ bigInt: maxCost, precision: 6 })} energy, which exceeds this task's energy policy.`,
			reactions: createReactions(action, [
				{
					skillKey: 'requestBudget',
					args: {
						estimatedCost: maxCost,
						previousActionKey: action.skillKey,
					},
				},
			]),
		});
		return false;
	}

	const isAuthorized = await canAuthorize(ctx, {
		task,
		action,
		skill,
		maxCost,
	});

	if (!isAuthorized) {
		await requestAuthorization(ctx, { action });
		return false;
	}

	try {
		await reserveEnergy(ctx, {
			task,
			action,
			maxCost,
		});

		return true;
	} catch (error) {
		if (!isError(INSUFFICIENT_ACCOUNT_FUNDS_ERROR, error)) throw error;

		console.info(
			`Failing ${action._id} because account balance cannot reserve ${asDollars({ bigInt: maxCost, precision: 6 })}.`,
		);
		await fail(ctx, {
			action,
			reason: `${action.skillKey} needs ${asDollars({ bigInt: maxCost, precision: 6 })} account energy before it can run.`,
			reactions: createReactions(action, [
				{
					skillKey: 'requestFunds',
					args: {
						amount: maxCost,
						previousActionKey: action.skillKey,
					},
				},
			]),
		});
		return false;
	}
}

async function schedulePerform(
	ctx: MutationCtx,
	{
		task,
		action,
	}: {
		task: Doc<'tasks'>;
		action: Doc<'actions'>;
	},
) {
	//
	// generated function references form the reactor loop, so pin the scheduler result at the boundary
	const scheduledFunctionId: Id<'_scheduled_functions'> = await ctx.scheduler.runAfter(0, internal.reactor._perform, {
		taskId: task._id,
		actionId: action._id,
	});

	console.debug(`${action._id} reserved as scheduled function ${scheduledFunctionId}`);

	return scheduledFunctionId;
}

async function markClaimRunning(
	ctx: MutationCtx,
	{
		claim,
		scheduledFunctionId,
	}: {
		claim: {
			task: Doc<'tasks'>;
			action: Doc<'actions'>;
		};
		scheduledFunctionId: Id<'_scheduled_functions'>;
	},
) {
	//
	await ctx.db.patch(claim.action._id, {
		status: 'running',
		claimedAt: Date.now(),
		scheduledFunctionId,
		...(!claim.action.approvedAt && {
			approvedBy: 'auto',
			approvedAt: Date.now(),
		}),
	});
	await setTaskStatus(ctx, { taskId: claim.task._id, newStatus: 'acting' }); // if any running action, task is 'acting'
}

function skipClaim(message: string) {
	//
	console.info(message);
	return null;
}

// called when reactor claim needs explicit user authorization before execution
export const _requestAuthorization = internalMutation({
	args: {
		actionId: zid('actions'),
		taskId: zid('tasks'),
	},
	handler: async (ctx, { actionId, taskId }) => {
		//
		console.debug(`requesting authorization for ${actionId}`);

		const action = await findAction(ctx, { actionId });
		if (action.taskId !== taskId) throw NotFound();

		await requestAuthorization(ctx, { action });
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

async function fail(
	ctx: MutationCtx,
	{
		action,
		reason,
		reactions,
	}: {
		action: Doc<'actions'>;
		reason: string;
		reactions: Array<z.infer<typeof newActionSchema>>;
	},
) {
	//
	await finish(ctx, {
		actionId: action._id,
		taskId: action.taskId,
		status: 'failed',
		costs: [],
		result: {
			text: reason,
			reactions,
		},
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
		actionId: Id<'actions'>;
		taskId: Id<'tasks'>;
		result: {
			text?: string | undefined;
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

	const action = await findActionToFinish(ctx, { actionId, taskId, status });
	if (!action) return;

	if (action.result) {
		throw new Error(`Action result already set for ${actionId}. Trying to set to ${JSON.stringify(result)}`);
	}

	const finishedResult = addFailureContextIfNeeded({ action, result, status });
	const actualCost = totalCostFrom(costs);

	console.debug(
		`Finished as ${status} with ${finishedResult.text?.length} characters. Total cost: ${asDollars({ bigInt: actualCost, precision: 6 })}`,
	);

	await settleAction(ctx, { action, costs });
	await updateTaskEnergy(ctx, { action, actualCost });
	await persistResult(ctx, { action, result: finishedResult, status, costs });
	const task = await updateTaskStatus(ctx, { action, status });
	await react(ctx, { task, action, result: finishedResult });
}

async function findActionToFinish(
	ctx: MutationCtx,
	{
		actionId,
		taskId,
		status,
	}: {
		actionId: Id<'actions'>;
		taskId: Id<'tasks'>;
		status: z.infer<typeof resolvedActionStatusSchema>;
	},
) {
	//
	const action = await ctx.db.get(actionId);
	if (!action) throw NotFound();
	if (action.taskId !== taskId) throw NotFound();

	if (action.status === 'skipped' || !canFinish(action, status)) {
		logIgnoredFinish({ action, status });
		return null;
	}

	return action;
}

async function updateTaskEnergy(
	ctx: MutationCtx,
	{
		action,
		actualCost,
	}: {
		action: Doc<'actions'>;
		actualCost: bigint;
	},
) {
	//
	if (actualCost <= 0n) return;

	await spendTaskEnergy(ctx, { taskId: action.taskId, amount: actualCost });
}

async function persistResult(
	ctx: MutationCtx,
	{
		action,
		result,
		status,
		costs,
	}: {
		action: Doc<'actions'>;
		result: {
			text?: string | undefined;
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
	await ctx.db.patch(action._id, {
		result,
		status,
		costs,
		finishedAt: Date.now(),
	});
}

async function updateTaskStatus(
	ctx: MutationCtx,
	{
		action,
		status,
	}: {
		action: Doc<'actions'>;
		status: z.infer<typeof resolvedActionStatusSchema>;
	},
) {
	//
	if (status === 'skipped') return null;
	if (isInterrupted(action)) return null;

	const task = await ctx.db.get(action.taskId);
	if (!task?.isActive) return null;

	await setTaskStatus(ctx, { taskId: task._id, newStatus: 'unread' });

	return task;
}

function logIgnoredFinish({
	action,
	status,
}: {
	action: Doc<'actions'>;
	status: z.infer<typeof resolvedActionStatusSchema>;
}) {
	//
	console.info(
		'IGNORED_FINISH',
		`_finish(${action._id}, ${status}) result was ignored because current status is ${action.status}.`,
		`skill key: ${action.skillKey}`,
	);

	// TODO: keep track of interruption costs
}

function canFinish(action: Doc<'actions'>, status: z.infer<typeof resolvedActionStatusSchema>) {
	//
	if (status === 'succeeded') return action.status === 'running';

	if (status === 'failed') {
		return (
			action.status === 'enqueued' || //
			action.status === 'blocked' ||
			action.status === 'running'
		);
	}

	if (isStarted(action)) return false;
	return (
		action.status === 'enqueued' || //
		action.status === 'blocked' ||
		action.status === 'running'
	);
}

function totalCostFrom(
	costs: Array<{
		amount: bigint;
	}>,
) {
	//
	return costs.reduce((total, cost) => total + cost.amount, 0n);
}

async function canAuthorize(
	ctx: MutationCtx,
	{
		task,
		action,
		skill,
		maxCost,
	}: {
		task: Doc<'tasks'>;
		action: Doc<'actions'>;
		skill: Doc<'skills'> | z.infer<typeof builtInSkillSchema>;
		maxCost: bigint;
	},
) {
	//
	if (action.approvedAt) return true;
	if (action.author === task.owner) return true;

	if (skill.preApprovedCost === 'none') return false;
	if (skill.preApprovedCost < maxCost) return false;

	if (maxCost > 0n && (await hasReachedMaxConsecutiveCompanionActions(ctx, task))) {
		console.debug(
			`Requesting human authorization for task ${task._id} because the last ${env.MAX_CONSECUTIVE_COMPANION_ACTIONS} actions are from Meseeks.`,
		);

		return false;
	}

	return true;
}

// ¡¡¡do not remove — this prevents machines from taking over!!!
async function hasReachedMaxConsecutiveCompanionActions(ctx: MutationCtx, task: Doc<'tasks'>) {
	//
	const lastActions = await findLastActions(ctx, {
		taskId: task._id,
		amount: env.MAX_CONSECUTIVE_COMPANION_ACTIONS,
	});

	return lastActions.every((action) => action.author !== task.owner);
}

async function requestAuthorization(
	ctx: MutationCtx,
	{
		action,
	}: {
		action: Doc<'actions'>;
	},
) {
	//
	if (action.status === 'blocked') return;
	if (action.status !== 'enqueued') {
		console.info(`Ignoring authorization request for ${action._id}; status is ${action.status}.`);
		return;
	}

	await ctx.db.patch(action._id, { status: 'blocked', authorizationRequestedAt: Date.now() });
	await setTaskStatus(ctx, { taskId: action.taskId, newStatus: 'blocked' });
}

async function react(
	ctx: MutationCtx,
	{
		task,
		action,
		result,
	}: {
		task: Doc<'tasks'> | null;
		action: Doc<'actions'>;
		result: {
			text?: string | undefined;
			reactions: Array<z.infer<typeof newActionSchema>>;
		};
	},
) {
	//
	if (!task) return;
	if (isInterrupted(action)) return;
	if (action.reactionTrigger === 'none') return;
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
