import { anthropic } from '@ai-sdk/anthropic';
import { cerebras } from '@ai-sdk/cerebras';
import { deepinfra } from '@ai-sdk/deepinfra';
import { deepseek } from '@ai-sdk/deepseek';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { openai } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { xai } from '@ai-sdk/xai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { type ModelMessage, generateText, type LanguageModel } from 'ai';
import { z } from 'zod/v3';
import type { Doc, Id } from './_generated/dataModel';
import type { ActionCtx, MutationCtx } from './_generated/server';
import { isRecord } from 'lib/guards';
import { asDollars } from 'lib/money';
import { env } from 'schemas/envSchema';
import type { IntelligenceKey } from 'schemas/intelligenceSchema';
import type { instructionVariableSchema, softSkillSchema } from 'schemas/skillSchema';
import {
	normalizeTaskWorkspace,
	renderTaskWorkspaceForPrompt,
	taskWorkspacePreferenceKey,
} from 'schemas/taskWorkspaceSchema';
import type { AITool } from 'schemas/toolSchema';
import { modelFrom } from 'skills/createAITool';
import { _toolsForMagicRock } from 'skills/tools';
import { internal } from './_generated/api';
import { ACTION_TIMEOUT_MS } from './reactor.constants';

// >be human
// >dig shiny rocks from ground
// >grind rocks into powder
// >transform rock powder into rock wafers
// >enchant wafers with lightning
// >rocks can now do math
// >use rocks to exchange information globally
// >combine global information into new enchantments
// >rocks can think now
// >ask magic rock questions
// >magic rock knows everything
// >delegate all tasks to magic rocks
// >tfw automation achieves infinite productivity
// >singularity.png
// >mfw humanity peaked by tricking rocks into thinking

const moonshot = createOpenAICompatible({
	name: 'moonshot',
	apiKey: env.MOONSHOT_API_KEY,
	baseURL: 'https://api.moonshot.ai/v1',
});

const inception = createOpenAICompatible({
	name: 'inception',
	apiKey: env.INCEPTION_API_KEY,
	baseURL: 'https://api.inceptionlabs.ai/v1',
});

function estimateTokenCount(message: ModelMessage): number {
	//
	let content = '';

	if (typeof message.content === 'string') {
		content = message.content;
	} else if (Array.isArray(message.content)) {
		// handle TextPart, ImagePart, etc.
		for (const part of message.content) {
			if ('text' in part && typeof part.text === 'string') {
				content += part.text;
			}
		}
	}

	// use the CHAR_PER_TOKEN env variable for estimation
	return Math.ceil(content.length / env.CHAR_PER_TOKEN);
}

export type MagicRockContext = Parameters<typeof generateText>[0];

export async function prepareContext(
	ctx: ActionCtx | MutationCtx,
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	skill: z.infer<typeof softSkillSchema>,
): Promise<MagicRockContext> {
	//
	const intelligenceKey = modelFrom(skill.config.model, task.preferredIntelligence);
	const model = languageModelFrom(intelligenceKey);

	const [history, instructions, tools] = await Promise.all([
		renderHistory(ctx, task, action),
		renderInstructions(ctx, task, action, skill),
		renderTools(ctx, task, action, skill),
	]);

	console.debug('model', intelligenceKey);
	console.debug('instructions', instructions);

	// determine provider from intelligence key
	const isAnthropic = intelligenceKey.startsWith('anthropic/');
	const isOpenAI = intelligenceKey.startsWith('openai/');
	const isGoogle = intelligenceKey.startsWith('google/');
	const isXai = intelligenceKey.startsWith('xai/');
	const isGPT5 = intelligenceKey.includes('gpt-5');
	const isGPT5_4 = intelligenceKey.includes('gpt-5.4');
	const isMoonshot = intelligenceKey.startsWith('moonshot/');
	const isDeepSeek = intelligenceKey.startsWith('deepseek/');

	// TODO: remove those hacks
	const temperature = (() => {
		//
		// those models dont support custom temperatures
		if (isGPT5_4) return undefined;
		if (isGPT5) return 1;
		if (isMoonshot) return 0.6;

		return skill.config.temperature;
	})();

	// build provider options based on the model provider
	const providerOptions = {
		// OpenAI: disable parallel tool calls
		...(isOpenAI && { openai: { parallelToolCalls: false } }),
		// Google: set safety settings to allow all content
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
		// xAI: set server-side storage
		...(isXai && { xai: { store: true } }), // true is the default
		// Kimi: disable reasoning
		...(isMoonshot && { moonshot: { thinking: { type: 'disabled' } } }),
		// DeepSeek: disable reasoning
		...(isDeepSeek && { deepseek: { thinking: { type: 'disabled' } } }),
	};

	return {
		model,
		temperature,
		maxOutputTokens: skill.config.maxTokens ?? undefined,
		frequencyPenalty: skill.config.frequencyPenalty ?? undefined,
		maxRetries: skill.config.maxRetries ?? undefined,
		seed: skill.config.seed ?? undefined,
		topK: skill.config.topK ?? undefined,
		topP: skill.config.topP ?? undefined,
		stopSequences: skill.config.stopSequences ?? undefined,
		toolChoice: 'required',
		timeout: { totalMs: ACTION_TIMEOUT_MS },
		system: instructions,
		messages: isAnthropic
			? [
					{
						role: 'system',
						content: instructions,
						providerOptions: {
							// AI SDK says this is on by default, but doesn't look like it is
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
					},
					...history,
				]
			: history,
		tools: tools,
		providerOptions: Object.keys(providerOptions).length > 0 ? providerOptions : undefined,
	};
}

export async function askMagicRock(args: MagicRockContext) {
	//
	const {
		finishReason,
		text,
		toolCalls,
		usage,
		warnings,
		providerMetadata,
		//
	} = await generateText(args);

	const result = {
		finishReason,
		text,
		// normalize toolCalls: ensure input is always a record
		toolCalls: toolCalls.map((call) => {
			//
			if (!isRecord(call.input)) {
				console.warn(`Unexpected non-record tool input for ${call.toolName}:`, typeof call.input, call.input);
				return { toolName: call.toolName, input: {} };
			}

			return { toolName: call.toolName, input: call.input };
		}),
		usage,
		warnings,
		providerMetadata,
	};

	console.debug('askMagicRock', result);

	return result;
}

export function languageModelFrom(
	intelligenceKey: IntelligenceKey, //
) {
	//
	// TODO: move this into @intelligenceSchema.ts
	const map: Record<IntelligenceKey, LanguageModel> = {
		//
		// Anthropic
		'anthropic/claude-4.5-opus': anthropic('claude-opus-4-5-20251101'),
		'anthropic/claude-4.1-opus': anthropic('claude-opus-4-1-20250805'),
		'anthropic/claude-4.5-sonnet': anthropic('claude-sonnet-4-5-20250929'),
		'anthropic/claude-4.5-haiku': anthropic('claude-haiku-4-5-20251001'),
		'anthropic/claude-4-opus': anthropic('claude-4-opus-20250514'),
		'anthropic/claude-4-sonnet': anthropic('claude-4-sonnet-20250514'),
		'anthropic/claude-3.7-sonnet': anthropic('claude-4-sonnet-20250514'), // 3.7 kept for retro-compatibility
		'anthropic/claude-3.5-haiku': anthropic('claude-3-5-haiku-latest'),

		// OpenAI
		'openai/gpt-5.5': openai('gpt-5.5'),
		'openai/gpt-5.4': openai('gpt-5.4'),
		'openai/gpt-5': openai('gpt-5'),
		'openai/gpt-5-mini': openai('gpt-5-mini'),
		'openai/gpt-5-nano': openai('gpt-5-nano'),
		'openai/gpt-4.1': openai('gpt-4.1'),
		'openai/gpt-4.1-mini': openai('gpt-4.1-mini'),
		'openai/gpt-4.1-nano': openai('gpt-4.1-nano'),
		'openai/gpt-oss-120b': openrouter('openai/gpt-oss-120b'),
		'openai/gpt-oss-20b': openrouter('openai/gpt-oss-20b'),

		// Google
		'google/gemini-2.5-pro': google('gemini-2.5-pro'),
		'google/gemini-2.5-flash': google('gemini-2.5-flash'),
		'google/gemini-2.5-flash-lite': google('gemini-2.5-flash-lite'),

		// xAI
		'xai/grok-4.1-fast-non-reasoning': xai.responses('grok-4-1-fast-non-reasoning'),
		'xai/grok-4': xai.responses('grok-4-0709'),
		'xai/grok-4-fast-non-reasoning': xai.responses('grok-4-fast-non-reasoning'),
		'xai/grok-build-0.1': xai.responses('grok-build-0.1'),
		'xai/grok-code-fast-1': xai.responses('grok-code-fast-1-0825'),
		'xai/grok-3': xai.responses('grok-3'),
		'xai/grok-3-mini': xai.responses('grok-3-mini'),

		// Groq
		'groq/qwen3-32b': groq('qwen/qwen3-32b'),

		// DeepSeek
		'deepseek/deepseek-v4-pro': deepseek('deepseek-v4-pro'),
		'deepseek/deepseek-v4-flash': deepseek('deepseek-v4-flash'),
		'deepseek/deepseek-v3': deepseek('deepseek-chat'),

		// Moonshot
		'moonshot/kimi-2': moonshot('kimi-k2-0905-preview'),
		'moonshot/kimi-2.5': moonshot('kimi-k2.5'),
		// 'moonshot/kimi-2': groq('moonshotai/kimi-k2-instruct'),

		// Inception Labs
		'inception/mercury-2': inception('mercury-2'),

		// Cerebras
		'cerebras/qwen3-235b': cerebras('qwen-3-235b-a22b'),
		'cerebras/zai-glm-4.7': cerebras('zai-glm-4.7'),
		'cerebras/zai-glm-4.6': cerebras('zai-glm-4.6'),

		// DeepInfra
		'deepinfra/qwen-3-coder': deepinfra('Qwen/Qwen3-Coder-480B-A35B-Instruct'),
		'deepinfra/glm-4.5': deepinfra('zai-org/GLM-4.5-Air'),

		// OpenRouter
		'openrouter/qwen-3-coder': openrouter('openrouter/horizon-alpha'),
		'openrouter/GLM-4.5-Air': openrouter('z-ai/glm-4.5-air'),
		'openrouter/GLM-4.5': openrouter('z-ai/glm-4.5'),

		// Together
		// 'together/llama-4-maverick': togetherai('meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8'),
	};

	if (intelligenceKey in map) return map[intelligenceKey];

	throw new Error(`Unknown model: ${intelligenceKey}`);

	// EXPERIMENTS
	// model: anthropic('claude-4-sonnet-20250514'), // <---- AGI
	// model: openai('gpt-4o', { parallelToolCalls: false }), // 2nd best
	// return groq('llama-3.3-70b-versatile'); // mei burro, mas tem potencial
	// return togetherai('meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo');
	// return togetherai('google/gemma-2-27b-it');
	// return togetherai('Qwen/Qwen2.5-72B-Instruct-Turbo');
	// return togetherai('mistralai/Mistral-7B-Instruct-v0.3');
	// return togetherai('meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo');
	// return groq('deepseek-r1-distill-llama-70b');
	// return deepinfra('deepseek-ai/DeepSeek-R1');
	// return deepinfra('microsoft/Phi-4-multimodal-instruct');
	// return deepinfra('google/gemma-2-27b-it');
	// model: google('gemma-3-27b-it'),
	// model: ollama('phi4-mini'),
	// model: ollama('gemma3:4b'),
	// model: anthropic('claude-3-5-haiku-20241022'), // ok, but very far from Sonnet
	// model: deepseek('deepseek-reasoner'), // complete failure, reasoner can't call tools
	// model: google('gemini-2.0-flash-001'), // useful for some tools, can search using Google
	// model: openai('o3-mini', { // suprisingly bad, worse than GPT-4o on every test
	// 	reasoningEffort: 'low',
	// 	structuredOutputs: false, // if setting to true, it gets more strict on tool schemas and disable parallel tool calls
	// }),
}

async function renderTools(
	ctx: ActionCtx | MutationCtx, //
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	skill: z.infer<typeof softSkillSchema>,
): Promise<Record<string, AITool>> {
	//
	const availableSkills = [
		...new Set( // as a Set to avoid duplicates
			skill.config.availableSkills.flatMap((skillItem) => {
				//
				if (skillItem === '{{taskSkills}}') return task.availableSkills ?? [];
				// TODO: support for more variables, better abstraction

				return skillItem;
			}),
		),
	];

	console.debug('loading tools, config:', availableSkills);

	// TODO: optimize
	const allTools = await _toolsForMagicRock(ctx, task, action);
	const tools = Object.fromEntries(Object.entries(allTools).filter(([key]) => availableSkills.includes(key)));

	console.debug('loaded tools', Object.keys(tools));

	if (Object.keys(tools).length !== availableSkills.length) {
		console.warn(
			'missing tools',
			availableSkills.filter((key) => !tools[key]),
		);
	}

	return tools;
}

function cropHistoryToTokenLimit(history: ModelMessage[], maxTokens: number = env.MAX_CONTEXT_TOKENS): ModelMessage[] {
	//
	const totalTokens = history.reduce((sum, message) => sum + estimateTokenCount(message), 0);

	console.debug('cropHistoryToTokenLimit', totalTokens, maxTokens);
	if (totalTokens <= maxTokens || history.length === 0) return history;

	// remove oldest message and recurse
	const [, ...remaining] = history;
	const removedTokens = estimateTokenCount(history[0]);

	console.debug(
		`Cropped oldest message.`,
		`Removed ${removedTokens} tokens.`,
		`Remaining: ${totalTokens - removedTokens} tokens, ${remaining.length} messages.`,
	);

	return cropHistoryToTokenLimit(remaining);
}

async function renderHistory(
	ctx: ActionCtx | MutationCtx, //
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
): Promise<Array<ModelMessage>> {
	//
	const actions = await ctx.runQuery(internal.action._findLastActions, {
		taskId: task._id,
		amount: env.MAX_CONTEXT_ACTIONS,
	});

	// filter, render, crop and flatten
	const history = cropHistoryToTokenLimit(
		actions
			// remove unfinished or skipped actions
			.filter((action: Doc<'actions'>) =>
				['succeeded', 'failed', 'pending authorization'].includes(action.status),
			)
			// remove the current action
			.filter((a: Doc<'actions'>) => a._id !== action._id)
			// reverse to show the most recent actions last
			.reverse()
			// render each action
			.map((action: Doc<'actions'>) => renderAction(action, task.owner === action.author))
			// filter out undefined
			.filter(
				(
					rendered: ModelMessage | Array<ModelMessage> | undefined,
				): rendered is ModelMessage | Array<ModelMessage> => rendered !== undefined,
			)
			// flatten
			.flatMap((message: ModelMessage | Array<ModelMessage>) => message),
	);

	const finalTokens = history.reduce((sum, message) => sum + estimateTokenCount(message), 0);

	console.debug(
		`Rendered last ${history.length} actions as history (${finalTokens} tokens, max ${env.MAX_CONTEXT_TOKENS})`,
	);

	return history;
}

function renderAction(
	action: Doc<'actions'>, //
	isUser: boolean,
): ModelMessage | Array<ModelMessage> | undefined {
	//
	// temporary until tasks/backlog/jsx-for-ai.mdx replaces this with per-skill ai history components.
	if ((action.skillKey === 'iterate' || action.skillKey === 'instruct') && !action.result?.text) return;

	return {
		role: isUser ? 'user' : 'assistant',
		content: [
			`<date>${new Date(action._creationTime).toISOString()}</date>`,
			`<skill>${action.skillKey}</skill>`,
			`<status>${action.status}</status>`,
			action.result?.text ? `<result>${action.result?.text}</result>` : '',
			// `<cost>${action.costs.reduce}</cost>`,
		].join(''),
	};
}

// function computeSince(
// 	task: Doc<'tasks'>, //
// 	skill: z.infer<typeof softSkillSchema>,
// ) {
// 	//
// 	switch (skill.config.historyMode) {
// 		//
// 		case 'since last instructed':
// 			return task.lastUpdatedAt ?? 0;

// 		case 'all':
// 			return 0;
// 	}
// }

async function renderInstructions(
	ctx: ActionCtx | MutationCtx, //
	task: Doc<'tasks'>, //
	action: Doc<'actions'>,
	skill: z.infer<typeof softSkillSchema>,
) {
	//
	let result = skill.config.instructions;

	// TODO: workaround because we needed an async
	result = await replaceAllSkillsIfNeeded(ctx, task.owner, result);
	result = await replaceActiveSkillsIfNeeded(ctx, task.owner, result);
	result = await replaceActiveTasksIfNeeded(ctx, task.owner, result);

	// Handle async variables
	const userInfo = await getUserInfoIfNeeded(ctx, task.owner, result);
	const taskSchedules = await getTaskSchedulesIfNeeded(ctx, task._id, result);
	const taskWorkspace = await getTaskWorkspaceIfNeeded(ctx, task.owner, task._id, result);

	// Single-pass parsing that handles both escaped and normal variables correctly
	result = parseAndReplaceVariables(result, task, action, userInfo, taskSchedules, taskWorkspace);

	return result;
}

function parseAndReplaceVariables(
	text: string,
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	userInfo?: string,
	taskSchedules?: string,
	taskWorkspace?: string,
): string {
	//
	// Use a single regex that captures all {{...}} patterns and distinguishes escaped from normal
	return text.replace(/\{\{(\\?)([^{}]+)\}\}/g, (match, backslash, variableName) => {
		//
		// If there's a backslash, it's escaped - return the literal {{variable}}
		if (backslash) {
			return `{{${variableName}}}`;
		}

		// Normal variable - replace with value
		const trimmedVariable = variableName.trim();
		const replacedValue = valueForVariable(trimmedVariable, task, action, userInfo, taskSchedules, taskWorkspace);

		// If the replacement contains {{}} patterns, we need to process them recursively
		// but only if they're different from the original to avoid infinite loops
		if (replacedValue !== match && replacedValue.includes('{{')) {
			return parseAndReplaceVariables(replacedValue, task, action, userInfo, taskSchedules, taskWorkspace);
		}

		return replacedValue;
	});
}

async function replaceAllSkillsIfNeeded(
	ctx: ActionCtx | MutationCtx, //
	userId: Id<'users'>,
	text: string,
): Promise<string> {
	//
	if (!text.includes('{{allSkills}}')) return text;

	const list = await ctx.runQuery(internal.skills._findAllKeys, {
		userId,
	});

	const variable = list
		.map((item: { key: string; description: string }) => `- *${item.key}*: ${item.description}`)
		.join('\n');

	return text.replace('{{allSkills}}', variable);
}

async function replaceActiveSkillsIfNeeded(
	ctx: ActionCtx | MutationCtx, //
	userId: Id<'users'>,
	text: string,
): Promise<string> {
	//
	if (!text.includes('{{activeSkills}}')) return text;

	const enabledSkills = await ctx.runQuery(internal.skills._findEnabledSkillsWithDetails, {
		userId,
	});

	const variable = enabledSkills
		.map(
			(skill: { key: string; description: string; inputSchema: string }) =>
				`- **${skill.key}**: ${skill.description}\n  Input schema: \`${skill.inputSchema}\``,
		)
		.join('\n');

	return text.replace('{{activeSkills}}', variable);
}

async function replaceActiveTasksIfNeeded(
	ctx: ActionCtx | MutationCtx, //
	userId: Id<'users'>,
	text: string,
): Promise<string> {
	//
	if (!text.includes('{{activeTasks}}')) return text;

	const limit = env.ACTIVE_TASKS_RENDER_LIMIT;
	const activeTasks = await ctx.runQuery(internal.tasks._findActiveTasks, {
		owner: userId,
		limit,
	});

	// Sort by total budget (highest first)
	const sortedTasks = activeTasks.sort(
		(
			a: {
				energyBudget: { total: bigint };
			},
			b: {
				energyBudget: { total: bigint };
			},
		) => Number(b.energyBudget.total - a.energyBudget.total),
	);

	const variable =
		'1 energy === 1 US dollar\n' +
		sortedTasks
			.map((task: Doc<'tasks'>) => {
				const title = task.title || 'Untitled';
				const totalBudget = asDollars({
					bigInt: task.energyBudget.total,
					precision: 2,
				});
				const createdAt = dateOrNever(task._creationTime);
				return `- *${title}* (id: ${task._id}, ${totalBudget} energy, created: ${createdAt})`;
			})
			.join('\n');

	return text.replace('{{activeTasks}}', variable || '<system>No active tasks found.</system>');
}

function valueForVariable(
	variable: z.infer<typeof instructionVariableSchema>, //
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	userInfo?: string,
	taskSchedules?: string,
	taskWorkspace?: string,
): string {
	//
	switch (variable) {
		//
		case 'task':
			return [
				`<id>{{task.id}}</id>`, //
				`<title>{{task.title}}</title>`,
				`<status>{{task.status}}</status>`,
				`<createdAt>{{task.createdAt}}</createdAt>`,
				`<lastUpdatedAt>{{task.lastUpdatedAt}}</lastUpdatedAt>`,
				`<energyBudget>{{task.energyBudget}}</energyBudget>`,
				`<instructions>{{task.instructions}}</instructions>`,
				`<summary>{{task.summary}}</summary>`,
				// `<parent>${task.parent}</parent>`,
			]
				.join('')
				.replaceAll('\t', '');

		case 'task.id':
			return task._id;

		case 'task.title':
			return task.title ?? '<system>no title</system>';

		case 'task.status':
			return task.status;

		case 'task.createdAt':
			return dateOrNever(task._creationTime);

		case 'task.lastUpdatedAt':
			return dateOrNever(task.lastUpdatedAt);

		case 'task.instructions':
			return task.instructions ?? '<system>no instructions</system>';

		case 'task.summary':
			return task.summary ?? '<system>no summary</system>';

		case 'task.parent':
			return task.parentId ?? '<system>no parent</system>';

		case 'task.energyBudget':
			return [
				`<total alt="Total energy user has budgeted for this task">{{task.energyBudget.total}}</total>`,
				`<spent alt="Amount already spent from the budget">{{task.energyBudget.spent}}</spent>`,
				`<available alt="Remaining energy available to resolve this task">{{task.energyBudget.available}}</available>`,
			].join('');

		case 'task.energyBudget.total':
			return asDollars({ bigInt: task.energyBudget.total, precision: 10 });

		case 'task.energyBudget.spent':
			return asDollars({
				bigInt: task.energyBudget.total - task.energyBudget.available,
				precision: 10,
			});

		case 'task.energyBudget.available':
			return asDollars({ bigInt: task.energyBudget.available, precision: 10 });

		case 'taskSchedules':
			return taskSchedules ?? '<system>No active schedules for this task.</system>';

		case 'taskWorkspace':
			return taskWorkspace ?? '<system>No task working memory.</system>';

		case 'currentDate':
			return new Date().toISOString();

		case 'userInfo':
			return (
				userInfo ||
				'<system>No user information available. Use setUserInfo skill to add personal details.</system>'
			);

		default:
			// input.* variables
			if (variable.startsWith('input.')) {
				//
				const argName = variable.slice(6); // remove 'input.' prefix
				const value = action.args[argName];

				if (value === undefined) {
					return `<system>no ${argName}</system>`;
				}

				// convert value to string representation
				if (typeof value === 'string') {
					return value;
				} else if (typeof value === 'object') {
					return JSON.stringify(value, null, 2);
				} else {
					return String(value);
				}
			}

			console.warn(`Unknown variable: ${variable}`);

			return variable;
	}
}

async function getUserInfoIfNeeded(
	ctx: ActionCtx | MutationCtx,
	userId: Id<'users'>,
	text: string,
): Promise<string | undefined> {
	//
	if (!text.includes('{{userInfo}}')) return undefined;

	const userInfoPreference = await ctx.runQuery(internal.users.preferences._getUserPreference, {
		userId,
		key: 'userInfo',
	});

	return (
		userInfoPreference?.value ||
		'<system>No user information available. Use setUserInfo skill to add personal details.</system>'
	);
}

async function getTaskSchedulesIfNeeded(
	ctx: ActionCtx | MutationCtx,
	taskId: Id<'tasks'>,
	text: string,
): Promise<string | undefined> {
	//
	if (!text.includes('{{taskSchedules}}')) return undefined;

	try {
		const schedules = await ctx.runQuery(internal.schedules._findByTask, {
			taskId,
		});

		if (schedules.length === 0) {
			return '<system>No active schedules for this task.</system>';
		}

		return schedules
			.map((schedule: Doc<'schedules'>) => {
				const nextRun = new Date(schedule.nextRunAt).toISOString();
				const type = schedule.scheduleType === 'one-time' ? 'One-time' : 'Recurring';
				const details =
					schedule.scheduleType === 'one-time'
						? `at ${nextRun}`
						: `cron: ${schedule.cronExpression}, next: ${nextRun}`;

				return [
					`<schedule>`,
					`<id>${schedule._id}</id>`,
					`<type>${type}</type>`,
					`<skillKey>${schedule.skillKey}</skillKey>`,
					`<details>${details}</details>`,
					`<timezone>${schedule.timeZone}</timezone>`,
					`</schedule>`,
				].join('');
			})
			.join('');
	} catch (error) {
		console.error('Failed to fetch task schedules:', error);
		return '<system>Error loading schedules.</system>';
	}
}

async function getTaskWorkspaceIfNeeded(
	ctx: ActionCtx | MutationCtx,
	userId: Id<'users'>,
	taskId: Id<'tasks'>,
	text: string,
): Promise<string | undefined> {
	if (!text.includes('{{taskWorkspace}}')) return undefined;

	const workspacePreference = await ctx.runQuery(internal.users.preferences._getUserPreference, {
		userId,
		key: taskWorkspacePreferenceKey(taskId),
	});

	return renderTaskWorkspaceForPrompt(normalizeTaskWorkspace(workspacePreference?.value));
}

function dateOrNever(date: number | undefined) {
	//
	if (!date) return 'never';

	return new Date(date).toISOString();
}
