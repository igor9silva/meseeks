import { z } from 'zod/v3';
import type { Doc, Id } from './_generated/dataModel';
import type { ActionCtx, MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { executeTool } from '@ai-sdk/provider-utils';
import { isError, NOT_ENOUGH_BUDGET_ERROR, messageFrom, NotEnoughBudget } from 'lib/errors';
import { newActionSchema, resolvedActionStatusSchema } from 'schemas/actionSchema';
import type { AIToolResult } from 'schemas/toolSchema';
import { tokenSchema } from 'schemas/topUpSchema';
import { createReactions } from 'skills/createReactions';
import { createTool } from 'skills/tools';
import { ACTION_TIMEOUT_MS } from './reactor.constants';
import { buildContext } from './reactor.context';

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

	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	let action: Doc<'actions'> | undefined;

	try {
		//
		const started = await ctx.runMutation(internal.reactor._start, {
			taskId,
			actionId,
		});

		if (!started) return null;

		const { task, skill, actionDetails } = started;
		const startedAction = started.action;
		action = startedAction;

		console.debug(
			`Using skill ${skill.key} with ${Object.keys(startedAction.args).length} args: ${Object.keys(startedAction.args).join(', ')}`,
		);

		const timeoutPromise = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(() => {
				reject(
					new Error(
						`Action execution timed out after ${ACTION_TIMEOUT_MS / 1000} seconds to handle Convex timeout`,
					),
				);
			}, ACTION_TIMEOUT_MS);
		});

		const executeWithTimeout = async () => {
			//
			let context: Awaited<ReturnType<typeof buildContext>> | undefined;
			if (skill.kind === 'soft') {
				if (!actionDetails) throw new Error(`Missing action details for soft action ${actionId}.`);

				context = await buildContext(ctx, {
					task,
					action: startedAction,
					details: actionDetails,
				});
			}

			const tool = createTool(ctx, task, startedAction, skill, context);
			const args = parseArgs(tool, startedAction.args);
			const execute = tool.execute;
			if (!execute) throw new Error(`Tool execute is not available for action ${startedAction._id}.`);

			const execution = executeTool({
				execute,
				input: args,
				options: {
					toolCallId: String(startedAction._id),
					messages: [],
				},
			});

			let toolResult: AIToolResult | undefined;
			for await (const part of execution) {
				if (part.type === 'final') {
					toolResult = part.output;
				}
			}

			if (!toolResult) throw new Error(`Tool execution returned no result for action ${startedAction._id}.`);

			const { result, costs } = toolResult;

			await setFinished(ctx, {
				actionId,
				taskId,
				result,
				status: 'succeeded',
				costs,
			});
		};

		await Promise.race([executeWithTimeout(), timeoutPromise]);
		//
	} catch (error) {
		//
		const result = action
			? await handleActionError({ actionId, action, error })
			: { text: messageFrom(error), reactions: [] };

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

	return null;
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
					maxCost: error.data.maxCost,
					previousActionKey: error.data.previousActionKey,
				},
			},
		]);
		//
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
	return await finishAction(ctx, args);
}

export async function finishAction(
	ctx: ActionCtx | MutationCtx,
	args: {
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
	return await ctx.runMutation(internal.reactor._finish, args);
}

export async function runNextActionIfNeeded(
	ctx: ActionCtx | MutationCtx, //
	{ taskId }: { taskId: Id<'tasks'> },
) {
	return await ctx.runMutation(internal.reactor._claimAndScheduleNext, { taskId });
}
