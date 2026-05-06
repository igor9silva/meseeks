import type { ModelMessage } from 'ai';
import { z } from 'zod/v3';
import type { Doc } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { actionDetailSchema } from 'schemas/actionDetailSchema';
import { builtInSkillSchema } from 'schemas/skillSchema';
import { computeMaxCost, extractSystemInstructions, modelFrom } from 'skills/createAITool';
import { prepareContext, type MagicRockContext } from './magicRock.private';
import { findActionDetails, persistActionDetails } from './action/details.private';
import { buildContext } from './reactor.context';

type Skill = Doc<'skills'> | z.infer<typeof builtInSkillSchema>;
type ActionDetails = z.infer<typeof actionDetailSchema>;

export async function prepare(
	ctx: MutationCtx,
	{
		task,
		action,
		skill,
		timeoutMs,
	}: {
		task: Doc<'tasks'>;
		action: Doc<'actions'>;
		skill: Skill;
		timeoutMs: number;
	},
) {
	//
	const existing = await findActionDetails(ctx, { actionId: action._id });
	if (existing && action.maxCost !== undefined) return action.maxCost;

	const context = await prepareExecutionContext(ctx, {
		task,
		action,
		skill,
		details: existing,
		timeoutMs,
	});

	if (!existing && skill.kind !== 'built-in') {
		await persistActionDetails(ctx, {
			details: createInitialActionDetails({ task, action, skill, context }),
		});
	}

	return computeMaxCost(skill, task, action._id, context);
}

export async function findDetails(
	ctx: MutationCtx,
	{
		action,
		skill,
	}: {
		action: Doc<'actions'>;
		skill: Skill;
	},
) {
	//
	if (skill.kind === 'built-in') return null;

	const actionDetails = await findActionDetails(ctx, { actionId: action._id });
	if (!actionDetails) throw new Error(`Missing action details for ${action._id}.`);

	return actionDetails;
}

async function prepareExecutionContext(
	ctx: MutationCtx,
	{
		task,
		action,
		skill,
		details,
		timeoutMs,
	}: {
		task: Doc<'tasks'>;
		action: Doc<'actions'>;
		skill: Skill;
		details: Doc<'action_details'> | null;
		timeoutMs: number;
	},
) {
	//
	if (skill.kind !== 'soft') return undefined;
	if (details && 'llm' in details) return await buildContext(ctx, { task, action, skill, details, timeoutMs });

	return await prepareContext(ctx, task, action, skill, timeoutMs);
}

function createInitialActionDetails({
	task,
	action,
	skill,
	context,
}: {
	task: Doc<'tasks'>;
	action: Doc<'actions'>;
	skill: Exclude<Skill, z.infer<typeof builtInSkillSchema>>;
	context?: MagicRockContext;
}): ActionDetails {
	//
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

	if (!context) throw new Error('Context is required for soft action details.');

	const intelligenceKey = modelFrom(skill.config.model, task.preferredIntelligence);
	const { model, provider } = modelAndProviderFrom(context, intelligenceKey);
	const history = Array.isArray(context.messages) ? context.messages : [];

	return {
		actionId: action._id,
		skillKind: 'soft',
		skillKey: skill.key,
		skillDescription: skill.description,
		llm: {
			intelligenceKey,
			model,
			provider,
			temperature: context.temperature ?? 0.7,
			maxTokens: context.maxOutputTokens,
			maxRetries: context.maxRetries,
			seed: context.seed,
			topK: context.topK,
			topP: context.topP,
			stopSequences: context.stopSequences,
			systemInstructions: extractSystemInstructions(context.system),
			historyLength: history.length,
			history: toStoredMessages(history),
			availableTools: context.tools ? Object.keys(context.tools) : [],
		},
	};
}

function modelAndProviderFrom(context: MagicRockContext, intelligenceKey: string) {
	//
	if (typeof context.model === 'string') {
		const [provider, model] = context.model.split('/');
		return {
			model: model ?? intelligenceKey,
			provider: provider ?? 'unknown',
		};
	}

	return {
		model: context.model.modelId,
		provider: context.model.provider,
	};
}

function toStoredMessages(messages: ReadonlyArray<ModelMessage>) {
	//
	return messages
		.filter((message) => message.role !== 'system')
		.map((message) => ({
			role: message.role,
			content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
		}));
}
