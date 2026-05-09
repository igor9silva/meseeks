import { z } from 'zod/v3';
import type { Doc } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { NotFound } from 'lib/errors';
import { asDollars } from 'lib/money';
import { canSpendPolicy } from 'lib/energyPolicy';
import { actionDetailSchema } from 'schemas/actionDetailSchema';
import { builtInSkillSchema } from 'schemas/skillSchema';
import { computeMaxCost, extractSystemInstructions, modelFrom } from 'skills/createAITool';
import { env } from 'schemas/envSchema';
import { prepareContext, type MagicRockContext } from './magicRock.private';
import { TASK_ENERGY_BUFFER_PERCENT } from './reactor.constants';
import { findActionDetails, persistActionDetails } from './action/details.private';
import { findLastActions } from './action.private';

export async function prepare(
	ctx: MutationCtx,
	{
		task,
		action,
		skill,
	}: {
		task: Doc<'tasks'>;
		action: Doc<'actions'>;
		skill: Doc<'skills'> | z.infer<typeof builtInSkillSchema>;
	},
) {
	//
	const existingDetails = await findActionDetails(ctx, { actionId: action._id });
	if (existingDetails && 'maxCost' in action) {
		return {
			maxCost: action.maxCost,
			estimatedCost: action.estimatedCost,
			details: existingDetails,
		};
	}

	const context = skill.kind === 'soft' ? await prepareContext(ctx, task, action, skill) : undefined;
	const maxCost = computeMaxCost(skill, task, action._id, context);
	const estimatedCost = estimateCost({ maxCost });
	const details = detailsFor({ task, action, skill, context });

	if (details) {
		await persistActionDetails(ctx, { details });
	}

	await ctx.db.patch(action._id, { maxCost, estimatedCost });

	return {
		maxCost,
		estimatedCost,
		details,
	};
}

export async function findRequiredActionDetails(
	ctx: MutationCtx,
	{
		action,
		skill,
	}: {
		action: Doc<'actions'>;
		skill: Doc<'skills'> | z.infer<typeof builtInSkillSchema>;
	},
) {
	//
	if (skill.kind === 'built-in') return null;

	const details = await findActionDetails(ctx, { actionId: action._id });
	if (!details) throw NotFound();

	return details;
}

export function canSpendTaskEnergy({
	task,
	maxCost,
}: {
	task: Doc<'tasks'>;
	maxCost: bigint;
}) {
	//
	return canSpendPolicy({
		total: task.energyBudget.total,
		available: task.energyBudget.available,
		amount: maxCost,
		bufferPercent: TASK_ENERGY_BUFFER_PERCENT,
	});
}

export async function canAuthorize(
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
	if ('approvedAt' in action) return true;
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

export function hasAccountEnergy({
	user,
	estimatedCost,
}: {
	user: Doc<'users'>;
	estimatedCost: bigint;
}) {
	//
	return (user.balanceUSD ?? 0n) >= estimatedCost;
}

function estimateCost({ maxCost }: { maxCost: bigint }) {
	//
	return (maxCost * BigInt(env.COST_ESTIMATE_PERCENT) + 99n) / 100n;
}

function detailsFor({
	task,
	action,
	skill,
	context,
}: {
	task: Doc<'tasks'>;
	action: Doc<'actions'>;
	skill: Doc<'skills'> | z.infer<typeof builtInSkillSchema>;
	context?: MagicRockContext;
}): z.infer<typeof actionDetailSchema> | null {
	//
	if (skill.kind === 'built-in') return null;

	if (skill.kind === 'hard') {
		return {
			actionId: action._id,
			skillKind: 'hard',
			skillKey: skill.key,
			skillDescription: skill.description,
			http: {
				method: skill.config.method,
				url: skill.config.url,
			},
		};
	}

	if (!context) {
		throw new Error('Context is required for soft action details.');
	}

	const { model, provider } = modelDetails({ task, skill });

	return {
		actionId: action._id,
		skillKind: 'soft',
		skillKey: skill.key,
		skillDescription: skill.description,
		llm: {
			model,
			provider,
			temperature: context.temperature ?? 0.7,
			maxTokens: context.maxOutputTokens,
			systemInstructions: extractSystemInstructions(context.system),
			historyLength: Array.isArray(context.messages) ? context.messages.length : 0,
			history: Array.isArray(context.messages)
				? context.messages
						.filter((message) => message.role !== 'system')
						.map((message) => ({
							role: message.role,
							content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
						}))
				: [],
			availableTools: context.tools ? Object.keys(context.tools) : [],
		},
	};
}

function modelDetails({
	task,
	skill,
}: {
	task: Doc<'tasks'>;
	skill: Doc<'skills'> | z.infer<typeof builtInSkillSchema>;
}) {
	//
	if (skill.kind !== 'soft') throw new Error(`Cannot get LLM model details for ${skill.kind} skill.`);

	const modelKey = modelFrom(skill.config.model, task.preferredIntelligence);
	const [provider, model] = modelKey.split('/');
	if (!provider || !model) throw new Error(`Invalid model key: ${modelKey}`);

	return {
		model,
		provider,
	};
}

async function hasReachedMaxConsecutiveCompanionActions(
	ctx: MutationCtx,
	task: Doc<'tasks'>,
) {
	//
	const lastActions = await findLastActions(ctx, {
		taskId: task._id,
		amount: env.MAX_CONSECUTIVE_COMPANION_ACTIONS,
	});

	console.debug(
		`Checking last ${lastActions.length} actions before authorizing.`,
		`Task ${task._id}.`,
		`Budget ${asDollars({ bigInt: task.energyBudget.available, precision: 6 })}.`,
	);

	return lastActions.every((action) => action.author !== task.owner);
}
