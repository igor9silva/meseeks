import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import type { Doc, Id } from '../_generated/dataModel';
import type { ActionCtx, MutationCtx } from '../_generated/server';
import { internalAction, internalMutation, internalQuery } from '../lib';
import { isError, messageFrom, NOT_ENOUGH_BUDGET_ERROR, NotEnoughBudget, NotFound } from '../lib/errors';
import { asDollars } from '../lib/money';
import { prepareContext, type MagicRockContext } from '../magicRock.private';
import { newActionSchema } from '../schemas/actionSchema';
import { env } from '../schemas/envSchema';
import type { skillSchema } from '../schemas/skillSchema';
import { builtInSkillSchema } from '../schemas/skillSchema';
import { tokenSchema } from '../schemas/topUpSchema';
import { estimateCostFor, extractSystemInstructions } from '../skills/createAITool';
import { createReactions } from '../skills/createReactions';
import { createTool } from '../skills/tools';
import { addMany, findOne as findOneAction } from '../action.private';
import { findOne as findOneSkill } from '../skills.private';
import { findOne as findOneTask, setStatus as setTaskStatus, useFunds } from '../tasks.private';
import { runNextActionIfNeeded } from './lifecycle.private';
import { internal } from '../_generated/api';

// Convex actions have a hardcoded 600-second timeout
// We need to finish before that to ensure setResolved gets called
const ACTION_TIMEOUT_MS = 590 * 1000; // 590 seconds to have 10 seconds buffer

// TODO: if that since we dropped support for sync actions, we can use ActionCtx only, and remove MutationCtx from the arg type
export const _perform = internalAction({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
	},
	handler: async (ctx, { taskId, actionId }) => {
		//
		console.debug(`Executing action ${actionId} for task ${taskId}`);

		const { task, action, skill } = await ctx.runQuery(internal.action.lifecycle._load, {
			taskId,
			actionId,
		});

		console.debug(
			`Using skill ${skill.key} with ${Object.keys(action.args).length} args: ${Object.keys(action.args).join(', ')}`,
		);

		// Create a timeout promise that rejects after ACTION_TIMEOUT_MS
		const timeoutPromise = new Promise((_, reject) => {
			setTimeout(() => {
				reject(
					new Error(
						`Action execution timed out after ${ACTION_TIMEOUT_MS / 1000} seconds to handle Convex timeout`,
					),
				);
			}, ACTION_TIMEOUT_MS);
		});

		// Wrap the entire try block execution with timeout
		const executeWithTimeout = async () => {
			//
			// prepare context if needed
			const context = skill.kind === 'soft' ? await prepareContext(ctx, task, action, skill) : undefined;

			// persist initial action details with request context
			await persistInitialActionDetails(ctx, action, skill, context);

			// check budget
			const expectedCost = await ensureWithinBudget(ctx, task, action, skill, context);

			console.debug(`Expected cost ${asDollars({ bigInt: expectedCost, precision: 6 })} energy.`);

			// if the action is not yet authorized, try auto-approving it
			if (!action.approvedAt) {
				//
				const wasAutoApproved = await tryAutoApprove(ctx, task, action, skill, expectedCost);

				// if failed, request human approval
				if (!wasAutoApproved) return await requestHumanApproval(ctx, actionId, taskId);
			}

			const tool = createTool(ctx, task, action, skill, context);
			const args = parseArgs(tool, action.args);

			// @ts-expect-error we intentionally do not support exposing toolCallId or message history to the tool execution
			const { result, costs } = await tool.execute(args);

			await setResolved(ctx, {
				actionId,
				taskId,
				result,
				status: 'succeeded',
				costs: costs,
				// TODO: also persist reactions
			});
		};

		try {
			//
			// Race the entire execution against the timeout
			await Promise.race([executeWithTimeout(), timeoutPromise]);
			//
		} catch (error) {
			//
			const result = await handleActionError({ actionId, action, error });

			await setResolved(ctx, {
				actionId,
				taskId,
				status: 'failed',
				costs: [],
				result: result ?? { text: 'Max auto-fix attempts reached.', reactions: [] },
			});
			//
		} finally {
			//
			await runNextActionIfNeeded(ctx, taskId);
		}
	},
});

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
			findOneTask(ctx, { taskId }), //
			findOneAction(ctx, { actionId }),
		]);

		const skill = await findOneSkill(ctx, {
			key: action.skillKey,
			owner: task.owner,
		});

		return { task, action, skill };
	},
});

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

export const _setEstimatedCost = internalMutation({
	args: {
		actionId: zid('actions'),
		estimatedCost: z.bigint(),
	},
	handler: async (ctx, { actionId, estimatedCost }) => {
		return await ctx.db.patch(actionId, { estimatedCost });
	},
});

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

export const _resolve = internalMutation({
	args: {
		actionId: zid('actions'),
		taskId: zid('tasks'),
		result: z.object({
			text: z.string().optional(),
			reactions: z.array(newActionSchema),
		}),
		status: z.enum(['succeeded', 'failed']),
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
			await useFunds(ctx, { taskId: action.taskId, amount: totalCost });
		}

		await ctx.db.patch(actionId, { result, status, costs });

		const task = await ctx.db.get(taskId);

		if (task?.isActive) {
			//
			await setTaskStatus(ctx, { taskId, newStatus: 'unread' });

			// schedule all reactions
			await addMany(ctx, {
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

function parseArgs(tool: ReturnType<typeof createTool>, args: unknown) {
	//
	// all our tools use Zod schemas, so inputSchema always has safeParse
	const schema = tool.inputSchema;

	// type guard: check that schema is a Zod schema with safeParse
	if (!('safeParse' in schema)) {
		throw new Error('Expected Zod schema but got something else');
	}

	const parsedArgs = schema.safeParse(args);

	if (!parsedArgs.success) throw new Error(`Invalid skill args: ${parsedArgs.error.message}`);

	return parsedArgs.data;
}

async function _estimateAndPersistCost(
	ctx: ActionCtx | MutationCtx,
	action: Doc<'actions'>,
	task: Doc<'tasks'>,
	skill: z.infer<typeof skillSchema>,
	context?: MagicRockContext,
) {
	if (action.estimatedCost) return action.estimatedCost;

	const estimatedCost = estimateCostFor(skill, task, action._id, context);

	console.debug(
		`Setting estimated cost for ${action._id}: ${asDollars({ bigInt: estimatedCost, precision: 6 })} energy`,
	);

	await ctx.runMutation(internal.action.lifecycle._setEstimatedCost, {
		actionId: action._id,
		estimatedCost,
	});

	return estimatedCost;
}

async function ensureWithinBudget(
	ctx: ActionCtx | MutationCtx,
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	skill: z.infer<typeof skillSchema>,
	context?: MagicRockContext,
) {
	//
	const estimatedCost = await _estimateAndPersistCost(ctx, action, task, skill, context);

	if (estimatedCost > task.energyBudget.available) {
		throw NotEnoughBudget(
			`Not enough energy. Estimated cost: ${asDollars({ bigInt: estimatedCost })}.`,
			action,
			action.skillKey,
			estimatedCost,
		);
	}

	return estimatedCost;
}

async function autoApprove(
	ctx: ActionCtx | MutationCtx, //
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
) {
	await ctx.runMutation(internal.action._authorize, {
		taskId: task._id,
		actionId: action._id,
		approver: 'auto',
		hasApproved: true,
	});

	return true;
}

async function tryAutoApprove(
	ctx: ActionCtx | MutationCtx,
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	skill: z.infer<typeof skillSchema>,
	expectedCost: bigint,
) {
	// auto approve if the author is the task owner
	if (action.author === task.owner) return autoApprove(ctx, task, action);

	// reject if requires more budget
	if (skill.preApprovedCost === 'none') return false;
	if (skill.preApprovedCost < expectedCost) return false;

	// reject if too many consecutive actions are from Meseeks
	if (expectedCost > 0n && (await hasReachedMaxConsecutiveCompanionActions(ctx, task))) {
		//
		console.debug(
			`Skipping reacting for task ${task._id} because the last ${env.MAX_CONSECUTIVE_COMPANION_ACTIONS} actions are from Meseeks.`,
		);

		return false;
	}

	return autoApprove(ctx, task, action);
}

// ¡¡¡do not remove — this prevents machines from taking over!!!
async function hasReachedMaxConsecutiveCompanionActions(
	ctx: ActionCtx | MutationCtx, //
	task: Doc<'tasks'>,
) {
	//
	const lastActions = await ctx.runQuery(internal.action._findLastActions, {
		taskId: task._id,
		amount: env.MAX_CONSECUTIVE_COMPANION_ACTIONS,
	});

	return lastActions.every((action: Doc<'actions'>) => action.author !== task.owner);
}

async function requestHumanApproval(
	ctx: ActionCtx | MutationCtx, //
	actionId: Id<'actions'>,
	taskId: Id<'tasks'>,
) {
	//
	await ctx.runMutation(internal.action.lifecycle._requestAuthorization, { actionId, taskId });
}

async function handleActionError({
	actionId,
	action,
	error,
}: {
	actionId: Id<'actions'>;
	action: Doc<'actions'>;
	error: unknown;
}): Promise<{
	text: string;
	reactions: Array<z.infer<typeof newActionSchema>>;
} | null> {
	//
	console.info(`action ${actionId} execution failed: ${error}`);

	const result = {
		text: messageFrom(error),
		reactions: [] as Array<z.infer<typeof newActionSchema>>,
	};

	// react with appropriate reactions
	if (isError(NOT_ENOUGH_BUDGET_ERROR, error)) {
		//
		console.debug(`Lacking energy for action ${actionId}. Requesting more energy.`);
		const typedError = error as ReturnType<typeof NotEnoughBudget>;

		result.text = typedError.data.message;
		result.reactions = createReactions(typedError.data.action, [
			{
				skillKey: 'requestBudget',
				args: {
					estimatedCost: typedError.data.estimatedCost,
					previousActionKey: typedError.data.previousActionKey,
				},
			},
		]);
		//
	} else {
		//
		// attempt auto-fix
		result.reactions = createReactions(action, [
			{
				skillKey: 'iterate',
				args: {},
			},
		]);
	}

	return result;
}

async function setResolved(
	ctx: ActionCtx | MutationCtx,
	args: {
		actionId: Id<'actions'>;
		taskId: Id<'tasks'>;
		result: {
			text?: string | undefined;
			reactions: Array<z.infer<typeof newActionSchema>>;
		};
		status: 'succeeded' | 'failed';
		costs: Array<{
			symbol: z.infer<typeof tokenSchema>;
			amount: bigint;
			description: string;
		}>;
	},
) {
	return await ctx.runMutation(internal.action.lifecycle._resolve, args);
}

async function persistInitialActionDetails(
	ctx: ActionCtx | MutationCtx,
	action: Doc<'actions'>,
	skill: Doc<'skills'> | z.infer<typeof builtInSkillSchema>,
	context?: MagicRockContext,
) {
	try {
		if (skill.kind === 'soft') {
			//
			if (!context) {
				throw new Error('Context is required for soft skills during initial persistence');
			}

			const { model, provider } = (() => {
				//
				if (typeof context.model === 'string') {
					const [provider, model] = context.model.split('/');
					return { model, provider };
				}

				return {
					model: context.model.modelId,
					provider: context.model.provider,
				};
			})();

			await ctx.runMutation(internal.action.details._persist, {
				details: {
					actionId: action._id,
					skillKind: 'soft' as const,
					skillKey: skill.key,
					skillDescription: skill.description,
					llm: {
						model,
						provider,
						temperature: context.temperature || 0.7,
						maxTokens: context.maxOutputTokens, // TODO: rename on DB
						systemInstructions: extractSystemInstructions(context.system),
						historyLength: Array.isArray(context.messages) ? context.messages.length : 0,
						history: Array.isArray(context.messages)
							? context.messages
									.filter((msg) => msg.role !== 'system')
									.map((msg) => ({
										role: msg.role,
										content:
											typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
									}))
							: [],
						availableTools: context.tools ? Object.keys(context.tools) : [],
					},
				},
			});
		} else if (skill.kind === 'hard') {
			//
			await ctx.runMutation(internal.action.details._persist, {
				details: {
					actionId: action._id,
					skillKind: 'hard' as const,
					skillKey: skill.key,
					skillDescription: skill.description,
					http: {
						method: skill.config.method,
						url: skill.config.url,
					},
				},
			});
		}
	} catch (error) {
		// If persistence fails, log but don't fail the action
		console.warn(`Failed to persist initial action details for ${action._id}:`, error);
	}
}
