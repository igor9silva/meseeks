import { z } from 'zod/v3';
import type { Doc, Id } from './_generated/dataModel';
import type { ActionCtx, MutationCtx } from './_generated/server';
import { internal } from './_generated/api';
import { executeTool } from '@ai-sdk/provider-utils';
import { messageFrom } from 'lib/errors';
import { newActionSchema, resolvedActionStatusSchema } from 'schemas/actionSchema';
import { authorSchema } from 'schemas/authorSchema';
import { builtInSkillSchema } from 'schemas/skillSchema';
import type { AIToolResult } from 'schemas/toolSchema';
import { env } from 'schemas/envSchema';
import { tokenSchema } from 'schemas/topUpSchema';
import { createTool } from 'skills/tools';
import { buildContext } from './reactor.context';

// convex actions hard-timeout after 10 minutes; keep reactor work below that so cleanup has runway
export const CONVEX_ACTION_TIMEOUT_MS = 600 * 1000;
export const ACTION_TIMEOUT_MS = CONVEX_ACTION_TIMEOUT_MS - env.ACTION_TIMEOUT_BUFFER_MS;

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

	let action: Doc<'actions'> | undefined;

	try {
		//
		const started = await startAction(ctx, { taskId, actionId });

		if (!started) {
			console.info(`Skipping action ${actionId} because start found stale state.`);
			return null;
		}

		action = started.action;

		console.debug(
			`Using skill ${started.skill.key} with ${Object.keys(started.action.args).length} args: ${Object.keys(started.action.args).join(', ')}`,
		);

		const { result, costs } = await runWithTimeout(() => executeAction(ctx, started), ACTION_TIMEOUT_MS);

		await finish(ctx, {
			actionId,
			taskId,
			result,
			status: 'succeeded',
			costs,
			// TODO: also persist reactions
		});
		//
	} catch (error) {
			//
			const result = action
				? await handleActionError({ actionId, error })
				: { text: messageFrom(error), reactions: [] };

		await finish(ctx, {
			actionId,
			taskId,
			status: 'failed',
			costs: [],
			result: result ?? { text: 'Max auto-fix attempts reached.', reactions: [] },
		});
		//
	} finally {
		//
		await runNextActionIfNeeded(ctx, { taskId });
	}

	return null;
}

async function startAction(
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
	return await ctx.runMutation(internal.reactor._start, {
		taskId,
		actionId,
	});
}

async function executeAction(
	ctx: ActionCtx,
	{
		task,
		action,
		skill,
		actionDetails,
	}: {
		task: Doc<'tasks'>;
		action: Doc<'actions'>;
		skill: Doc<'skills'> | z.infer<typeof builtInSkillSchema>;
		actionDetails: Doc<'action_details'> | null;
	},
) {
	//
	const context =
		skill.kind === 'soft' && actionDetails
			? await buildContext(ctx, {
					task,
					action,
					skill,
					details: actionDetails,
					timeoutMs: ACTION_TIMEOUT_MS,
				})
			: undefined;

	const tool = createTool(ctx, task, action, skill, context);
	const args = parseArgs(tool, action.args);
	const run = tool.execute;
	if (!run) throw new Error(`Tool execute is not available for action ${action._id}.`);

	const execution = executeTool({
		execute: run,
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

	return toolResult;
}

async function runWithTimeout<T>(work: () => Promise<T>, timeoutMs: number) {
	//
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new Error(`Action execution timed out after ${timeoutMs / 1000} seconds to handle Convex timeout`));
		}, timeoutMs);
	});

	try {
		return await Promise.race([work(), timeoutPromise]);
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
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

async function handleActionError({
	actionId,
	error,
}: {
	actionId: Id<'actions'>;
	error: unknown;
}): Promise<{
	text: string;
	reactions: Array<z.infer<typeof newActionSchema>>;
} | null> {
	//
	console.info(`action ${actionId} execution failed: ${error}`);

	return {
		text: messageFrom(error),
		reactions: [],
	};
}

export async function interrupt(
	ctx: MutationCtx,
	{
		action,
		author,
	}: {
		action: Doc<'actions'>;
		author: z.infer<typeof authorSchema>;
	},
) {
	//
	await ctx.db.patch(action._id, {
		interruptedAt: Date.now(),
		interruptedBy: author,
	});
}

export async function skip(
	ctx: ActionCtx | MutationCtx,
	{
		action,
		reason,
	}: {
		action: Doc<'actions'>;
		reason: string;
	},
) {
	//
	if (isStarted(action)) {
		throw new Error(`Cannot skip started action ${action._id}; interrupt it and let the reactor finish financially.`);
	}

	return await finish(ctx, {
		actionId: action._id,
		taskId: action.taskId,
		status: 'skipped',
		costs: [],
		result: {
			text: reason,
			reactions: [],
		},
	});
}

export async function finish(
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
	return await ctx.runMutation(internal.reactor._finish, args);
}

export async function runNextActionIfNeeded(
	ctx: ActionCtx | MutationCtx, //
	{ taskId }: { taskId: Id<'tasks'> },
) {
	return await ctx.runMutation(internal.reactor._claimNext, { taskId });
}

export function isStarted(action: Doc<'actions'>) {
	//
	return action.claimedAt !== undefined && action.startedAt !== undefined && action.startedAt >= action.claimedAt;
}

export function isInterrupted(action: Doc<'actions'>) {
	//
	return action.interruptedAt !== undefined;
}
