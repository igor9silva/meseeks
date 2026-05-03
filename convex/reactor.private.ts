import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Doc, Id } from './_generated/dataModel';
import type { ActionCtx, MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { executeTool } from '@ai-sdk/provider-utils';
import { isError, NOT_ENOUGH_BUDGET_ERROR, messageFrom, NotEnoughBudget } from 'lib/errors';
import { asDollars } from 'lib/money';
import { prepareContext, type MagicRockContext } from './magicRock.private';
import { newActionSchema } from 'schemas/actionSchema';
import type { AIToolResult } from 'schemas/toolSchema';
import { env } from 'schemas/envSchema';
import type { skillSchema } from 'schemas/skillSchema';
import { builtInSkillSchema } from 'schemas/skillSchema';
import { tokenSchema } from 'schemas/topUpSchema';
import { estimateCostFor, extractSystemInstructions } from 'skills/createAITool';
import { createReactions } from 'skills/createReactions';
import { createTool } from 'skills/tools';
import { ACTION_TIMEOUT_MS } from './reactor.constants';

export async function perform(
	ctx: ActionCtx,
	{
		taskId,
		actionId,
	}: {
		taskId: Id<'tasks'>;
		actionId: Id<'actions'>;
	},
) {
	//
	console.debug(`Executing action ${actionId} for task ${taskId}`);

	const { task, action, skill } = await ctx.runQuery(internal.reactor._prepare, {
		taskId,
		actionId,
	});

	console.debug(
		`Using skill ${skill.key} with ${Object.keys(action.args).length} args: ${Object.keys(action.args).join(', ')}`,
	);

	// create a timeout promise that rejects before convex's hard timeout
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(
				new Error(
					`Action execution timed out after ${ACTION_TIMEOUT_MS / 1000} seconds to handle Convex timeout`,
				),
			);
		}, ACTION_TIMEOUT_MS);
	});

	// wrap the entire try block execution with timeout
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
			if (!wasAutoApproved) return await requestHumanApproval(ctx, { actionId, taskId });
		}

		const tool = createTool(ctx, task, action, skill, context);
		const args = parseArgs(tool, action.args);
		const execute = tool.execute;
		if (!execute) throw new Error(`Tool execute is not available for action ${action._id}.`);

		const execution = executeTool({
			execute,
			input: args,
			options: {
				toolCallId: String(action._id),
				messages: [],
			},
		});

		let toolResult: AIToolResult | undefined;
		for await (const part of execution) {
			if (part.type === 'final') {
				toolResult = part.output;
			}
		}

		if (!toolResult) throw new Error(`Tool execution returned no result for action ${action._id}.`);

		const { result, costs } = toolResult;

		await setFinished(ctx, {
			actionId,
			taskId,
			result,
			status: 'succeeded',
			costs,
			// TODO: also persist reactions
		});
	};

	try {
		//
		// race the entire execution against the timeout
		await Promise.race([executeWithTimeout(), timeoutPromise]);
		//
	} catch (error) {
		//
		const result = await handleActionError({ actionId, action, error });

		await setFinished(ctx, {
			actionId,
			taskId,
			status: 'failed',
			costs: [],
			result: result ?? { text: 'Max auto-fix attempts reached.', reactions: [] },
		});
		//
	} finally {
		//
		if (timeoutId) clearTimeout(timeoutId);
		await runNextActionIfNeeded(ctx, { taskId });
	}
}

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

async function estimateAndPersistCost(
	ctx: ActionCtx,
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

	await ctx.runMutation(internal.reactor._setEstimatedCost, {
		actionId: action._id,
		estimatedCost,
	});

	return estimatedCost;
}

async function ensureWithinBudget(
	ctx: ActionCtx,
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	skill: z.infer<typeof skillSchema>,
	context?: MagicRockContext,
) {
	//
	const estimatedCost = await estimateAndPersistCost(ctx, action, task, skill, context);

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
	ctx: ActionCtx, //
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
	ctx: ActionCtx,
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
	ctx: ActionCtx, //
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
	ctx: ActionCtx, //
	{
		actionId,
		taskId,
	}: {
		actionId: Id<'actions'>;
		taskId: Id<'tasks'>;
	},
) {
	//
	await ctx.runMutation(internal.reactor._requestAuthorization, { actionId, taskId });
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

	const result: {
		text: string;
		reactions: Array<z.infer<typeof newActionSchema>>;
	} = {
		text: messageFrom(error),
		reactions: [],
	};

	// react with appropriate reactions
	if (isNotEnoughBudgetError(error)) {
		//
		console.debug(`Lacking energy for action ${actionId}. Requesting more energy.`);

		result.text = error.data.message;
		result.reactions = createReactions(error.data.action, [
			{
				skillKey: 'requestBudget',
				args: {
					estimatedCost: error.data.estimatedCost,
					previousActionKey: error.data.previousActionKey,
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

function isNotEnoughBudgetError(error: unknown): error is ReturnType<typeof NotEnoughBudget> {
	//
	return isError(NOT_ENOUGH_BUDGET_ERROR, error);
}

async function setFinished(
	ctx: ActionCtx,
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
	return await ctx.runMutation(internal.reactor._finish, args);
}

async function persistInitialActionDetails(
	ctx: ActionCtx,
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
					skillKind: 'soft',
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
					skillKind: 'hard',
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

export async function runNextActionIfNeeded(
	ctx: ActionCtx | MutationCtx, //
	{ taskId }: { taskId: Id<'tasks'> },
) {
	return await ctx.runMutation(internal.reactor._claimAndScheduleNext, { taskId });
}
