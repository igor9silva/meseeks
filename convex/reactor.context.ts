import type { ModelMessage } from 'ai';
import { z } from 'zod/v3';
import type { Doc } from './_generated/dataModel';
import type { ActionCtx, MutationCtx } from './_generated/server';
import { actionDetailSchema } from 'schemas/actionDetailSchema';
import { builtInSkillSchema } from 'schemas/skillSchema';
import { modelFrom } from 'skills/createAITool';
import { _toolsForMagicRock } from 'skills/tools';
import { languageModelFrom, type MagicRockContext } from './magicRock.private';

type Skill = Doc<'skills'> | z.infer<typeof builtInSkillSchema>;
type ActionDetails = z.infer<typeof actionDetailSchema>;
type LlmActionDetails = Extract<ActionDetails, { skillKind: 'soft' }>;

export async function buildContext(
	ctx: ActionCtx | MutationCtx,
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
		details: Doc<'action_details'> | ActionDetails;
		timeoutMs: number;
	},
): Promise<MagicRockContext | undefined> {
	//
	if (skill.kind !== 'soft') return undefined;
	if (!('llm' in details)) {
		throw new Error(`Expected LLM action details for soft action ${action._id}.`);
	}

	const intelligenceKey = details.llm.intelligenceKey ?? modelFrom(skill.config.model, task.preferredIntelligence);
	const allTools = await _toolsForMagicRock(ctx, task, action);
	const tools = pickTools(allTools, details.llm.availableTools);
	const history = toModelMessages(details.llm.history);
	const systemMessage: ModelMessage = {
		role: 'system',
		content: details.llm.systemInstructions,
		providerOptions: {
			anthropic: { cacheControl: { type: 'ephemeral' } },
		},
	};
	const messages: ModelMessage[] = intelligenceKey.startsWith('anthropic/') ? [systemMessage, ...history] : history;

	return {
		model: languageModelFrom(intelligenceKey),
		temperature: details.llm.temperature,
		maxOutputTokens: details.llm.maxTokens,
		maxRetries: details.llm.maxRetries,
		seed: details.llm.seed,
		topK: details.llm.topK,
		topP: details.llm.topP,
		stopSequences: details.llm.stopSequences,
		toolChoice: 'required',
		timeout: { totalMs: timeoutMs },
		system: details.llm.systemInstructions,
		messages,
		tools,
		providerOptions: providerOptionsFor(intelligenceKey),
	};
}

function toModelMessages(messages: LlmActionDetails['llm']['history']) {
	//
	const result: ModelMessage[] = [];

	for (const message of messages) {
		const modelMessage = toModelMessage(message);
		if (modelMessage) result.push(modelMessage);
	}

	return result;
}

function toModelMessage(message: LlmActionDetails['llm']['history'][number]): ModelMessage | undefined {
	//
	switch (message.role) {
		case 'system':
			return { role: 'system', content: message.content };
		case 'user':
			return { role: 'user', content: message.content };
		case 'assistant':
			return { role: 'assistant', content: message.content };
		default:
			return undefined;
	}
}

function pickTools<Tool>(tools: Record<string, Tool>, keys: string[]) {
	//
	const picked: Record<string, Tool> = {};

	for (const key of keys) {
		const tool = tools[key];
		if (tool) picked[key] = tool;
	}

	return picked;
}

function providerOptionsFor(intelligenceKey: string): MagicRockContext['providerOptions'] {
	//
	if (intelligenceKey.startsWith('openai/')) return { openai: { parallelToolCalls: false } };
	if (intelligenceKey.startsWith('xai/')) return { xai: { store: true } };
	if (intelligenceKey.startsWith('moonshot/')) return { moonshot: { thinking: { type: 'disabled' } } };

	if (intelligenceKey.startsWith('google/')) {
		return {
			google: {
				safetySettings: [
					{ category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
					{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
					{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
					{ category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
					{ category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
				],
			},
		};
	}

	return undefined;
}
