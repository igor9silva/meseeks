import type { ModelMessage } from 'ai';
import type { Doc } from './_generated/dataModel';
import type { ActionCtx } from './_generated/server';
import type { MagicRockContext } from './magicRock.private';
import { ACTION_TIMEOUT_MS } from './reactor.constants';
import { languageModelFrom } from './magicRock.private';
import { INTELLIGENCES, intelligenceKeys } from 'schemas/intelligenceSchema';
import { _toolsForMagicRock } from 'skills/tools';

export async function buildContext(
	ctx: ActionCtx,
	{
		task,
		action,
		details,
	}: {
		task: Doc<'tasks'>;
		action: Doc<'actions'>;
		details: Doc<'action_details'>;
	},
): Promise<MagicRockContext> {
	//
	if (details.skillKind !== 'soft') {
		throw new Error(`Cannot build LLM context from ${details.skillKind} action details.`);
	}

	const modelKey = `${details.llm.provider}/${details.llm.model}`;
	const parsedModel = intelligenceKeys.safeParse(modelKey);
	if (!parsedModel.success) throw new Error(`Unknown model: ${modelKey}`);

	const model = languageModelFrom(parsedModel.data);
	const maxOutputTokens = details.llm.maxTokens ?? INTELLIGENCES[parsedModel.data].context.maxOutputTokens;
	const tools = await toolsFromDetails(ctx, { task, action, details });
	const isAnthropic = modelKey.startsWith('anthropic/');
	const isOpenAI = modelKey.startsWith('openai/');
	const isGoogle = modelKey.startsWith('google/');
	const isXai = modelKey.startsWith('xai/');
	const isMoonshot = modelKey.startsWith('moonshot/');

	const providerOptions = {
		...(isOpenAI && { openai: { parallelToolCalls: false } }),
		...(isGoogle && {
			google: {
				safetySettings: [
					{ category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
					{
						category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
						threshold: 'BLOCK_NONE',
					},
					{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
					{
						category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
						threshold: 'BLOCK_NONE',
					},
					{
						category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
						threshold: 'BLOCK_NONE',
					},
				],
			},
		}),
		...(isXai && { xai: { store: true } }),
		...(isMoonshot && { moonshot: { thinking: { type: 'disabled' } } }),
	};

	const history = details.llm.history
		.map(modelMessageFromDetail)
		.filter((message): message is ModelMessage => message !== null);

	return {
		model,
		temperature: details.llm.temperature,
		maxOutputTokens,
		toolChoice: 'required',
		timeout: { totalMs: ACTION_TIMEOUT_MS },
		system: details.llm.systemInstructions,
		messages: isAnthropic
			? [
					{
						role: 'system',
						content: details.llm.systemInstructions,
					},
					...history,
				]
			: history,
		tools,
		providerOptions: Object.keys(providerOptions).length > 0 ? providerOptions : undefined,
	};
}

async function toolsFromDetails(
	ctx: ActionCtx,
	{
		task,
		action,
		details,
	}: {
		task: Doc<'tasks'>;
		action: Doc<'actions'>;
		details: Doc<'action_details'> & { skillKind: 'soft' };
	},
) {
	//
	const allTools = await _toolsForMagicRock(ctx, task, action);

	return Object.fromEntries(
		Object.entries(allTools).filter(([key]) => details.llm.availableTools.includes(key)),
	);
}

function modelMessageFromDetail(message: {
	role: 'assistant' | 'data' | 'function' | 'system' | 'tool' | 'user';
	content: string;
}): ModelMessage | null {
	//
	switch (message.role) {
		case 'assistant':
			return { role: 'assistant', content: message.content };
		case 'system':
			return { role: 'system', content: message.content };
		case 'user':
			return { role: 'user', content: message.content };
		default:
			return null;
	}
}
