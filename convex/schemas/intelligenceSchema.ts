import { z } from 'zod';
import { asDollars, asBigInt } from '../lib/money';

// TODO: dynamic read from models.dev

// TODO: move those into env vars
const TOKEN_TO_WORD_RATIO = 0.75; // 1 token ≈ 0.75 words
const WORD_TO_TOKEN_RATIO = 1 / TOKEN_TO_WORD_RATIO; // 1 word ≈ 1.333 tokens
const INPUT_COST_WEIGHT = 80n; // input weights for ≈80% of the cost
const OUTPUT_COST_WEIGHT = 20n; // output weights for ≈20% of the cost

const buildContext = (maxTokens: number) => ({
	maxTokens,
	maxWords: Math.round(maxTokens * TOKEN_TO_WORD_RATIO),
});

const buildPricing = ({ input, output }: { input: number; output: number }) => {
	//
	const inputPerToken = asBigInt({ dollars: input }) / 1_000_000n;
	const outputPerToken = asBigInt({ dollars: output }) / 1_000_000n;
	//
	// pricing per million tokens
	const inputPerMillionToken = inputPerToken * 1_000_000n;
	const outputPerMillionToken = outputPerToken * 1_000_000n;
	//
	const weightedInputCost = (inputPerMillionToken * INPUT_COST_WEIGHT) / 100n;
	const weightedOutputCost = (outputPerMillionToken * OUTPUT_COST_WEIGHT) / 100n;
	const estimatedCostPerMillion = weightedInputCost + weightedOutputCost;
	//
	// estimated cost per million words
	const tokensPerMillionWords = BigInt(Math.round(WORD_TO_TOKEN_RATIO * 1_000_000));
	const estimatedPerMillionWords = (estimatedCostPerMillion * tokensPerMillionWords) / 1_000_000n;
	//
	return {
		inputPerToken,
		inputPerMillionToken,
		outputPerToken,
		outputPerMillionToken,
		estimatedPerMillionWords,
	};
};

export const DEFAULT_INTELLIGENCE: IntelligenceKey = 'xai/grok-4.1-fast-non-reasoning';

// dynamically chooses the intelligence to use based on the available energy
export const INTELLIGENCE_PROGRESSION = {
	'xai/grok-4.1-fast-non-reasoning': 5.0,
	'cerebras/zai-glm-4.6': 50.0,
	'anthropic/claude-4.5-sonnet': 200.0,
	'anthropic/claude-4.5-opus': Infinity,
} as const;

export const intelligenceKeys = z.enum([
	//
	// Anthropic
	'anthropic/claude-4.5-opus',
	'anthropic/claude-4.1-opus',
	'anthropic/claude-4.5-sonnet',
	'anthropic/claude-4.5-haiku',
	'anthropic/claude-4-opus',
	'anthropic/claude-4-sonnet',
	'anthropic/claude-3.7-sonnet',
	'anthropic/claude-3.5-haiku',

	// OpenAI
	// 'openai/gpt-5.1',
	// 'openai/gpt-5.1-chat',
	// 'openai/gpt-5.1-codex',
	// 'openai/gpt-5.1-codex-mini',
	'openai/gpt-5',
	'openai/gpt-5-mini',
	'openai/gpt-5-nano',
	'openai/gpt-4.1',
	'openai/gpt-4.1-mini',
	'openai/gpt-4.1-nano',
	'openai/gpt-oss-120b',
	'openai/gpt-oss-20b',

	// Google
	'google/gemini-2.5-pro',
	'google/gemini-2.5-flash',
	'google/gemini-2.5-flash-lite',

	// xAI
	'xai/grok-4.1-fast-non-reasoning',
	'xai/grok-4',
	'xai/grok-4-fast-non-reasoning',
	'xai/grok-code-fast-1',
	'xai/grok-3',
	'xai/grok-3-mini',

	// Groq
	'groq/qwen3-32b',

	// DeepSeek
	'deepseek/deepseek-v3',

	// Moonshot
	'moonshot/kimi-2',

	// Cerebras
	'cerebras/qwen3-235b',
	'cerebras/zai-glm-4.6',

	// DeepInfra
	'deepinfra/qwen-3-coder',
	'deepinfra/glm-4.5',

	// OpenRouter
	'openrouter/qwen-3-coder',
	'openrouter/GLM-4.5-Air',
	'openrouter/GLM-4.5',
]);

export const INTELLIGENCES: Record<IntelligenceKey, Intelligence> = {
	//

	// ==============================
	//           Anthropic
	// ==============================
	'anthropic/claude-4.5-opus': {
		key: 'anthropic/claude-4.5-opus',
		name: 'Claude 4.5 Opus',
		description: '🐐 GOAT — for extreme tasks. Expensive ⚠️',
		provider: 'Anthropic',
		pricing: buildPricing({ input: 5, output: 25 }),
		context: buildContext(200_000),
		intelligenceLevel: 10,
	},
	'anthropic/claude-4.1-opus': {
		key: 'anthropic/claude-4.1-opus',
		name: 'Claude 4.1 Opus',
		provider: 'Anthropic',
		pricing: buildPricing({ input: 15, output: 75 }),
		context: buildContext(128_000),
		intelligenceLevel: 9,
	},
	'anthropic/claude-4.5-sonnet': {
		key: 'anthropic/claude-4.5-sonnet',
		name: 'Claude 4.5 Sonnet',
		description: 'Best overall — way more costly than Grok.',
		provider: 'Anthropic',
		pricing: buildPricing({ input: 3, output: 15 }),
		context: buildContext(128_000),
		intelligenceLevel: 7,
	},
	'anthropic/claude-4.5-haiku': {
		key: 'anthropic/claude-4.5-haiku',
		name: 'Claude 4.5 Haiku',
		description: 'Cheap',
		provider: 'Anthropic',
		pricing: buildPricing({ input: 1, output: 5 }),
		context: buildContext(128_000),
		intelligenceLevel: 5,
	},
	'anthropic/claude-4-opus': {
		key: 'anthropic/claude-4-opus',
		name: 'Claude 4 Opus',
		provider: 'Anthropic',
		pricing: buildPricing({ input: 15, output: 75 }),
		context: buildContext(200_000),
		intelligenceLevel: 10,
	},
	'anthropic/claude-4-sonnet': {
		key: 'anthropic/claude-4-sonnet',
		name: 'Claude 4 Sonnet',
		provider: 'Anthropic',
		pricing: buildPricing({ input: 3, output: 15 }),
		context: buildContext(256_000),
		intelligenceLevel: 8,
	},
	'anthropic/claude-3.7-sonnet': {
		key: 'anthropic/claude-3.7-sonnet',
		name: 'Claude 3.7 Sonnet',
		provider: 'Anthropic',
		// 3.7 kept for retro-compatibility
		pricing: buildPricing({ input: 3, output: 15 }),
		context: buildContext(256_000),
		intelligenceLevel: 8,
	},
	'anthropic/claude-3.5-haiku': {
		key: 'anthropic/claude-3.5-haiku',
		name: 'Claude 3.5 Haiku',
		description: 'Surprisingly very good, very cheap',
		provider: 'Anthropic',
		pricing: buildPricing({ input: 0.8, output: 4 }),
		context: buildContext(200_000),
		intelligenceLevel: 6,
	},

	// ==============================
	//             OpenAI
	// ==============================
	'openai/gpt-5': {
		key: 'openai/gpt-5',
		name: 'GPT-5',
		description: 'Testing',
		provider: 'OpenAI',
		pricing: buildPricing({ input: 1.25, output: 10 }),
		context: buildContext(128_000),
		intelligenceLevel: 9,
	},
	'openai/gpt-5-mini': {
		key: 'openai/gpt-5-mini',
		name: 'GPT-5 Mini',
		provider: 'OpenAI',
		pricing: buildPricing({ input: 0.25, output: 2 }),
		context: buildContext(128_000),
		intelligenceLevel: 7,
	},
	'openai/gpt-5-nano': {
		key: 'openai/gpt-5-nano',
		name: 'GPT-5 Nano',
		provider: 'OpenAI',
		pricing: buildPricing({ input: 0.05, output: 0.4 }),
		context: buildContext(128_000),
		intelligenceLevel: 5,
	},
	'openai/gpt-4.1': {
		key: 'openai/gpt-4.1',
		name: 'GPT-4.1',
		provider: 'OpenAI',
		pricing: buildPricing({ input: 2.0, output: 8.0 }),
		context: buildContext(128_000),
		intelligenceLevel: 8,
	},
	'openai/gpt-4.1-mini': {
		key: 'openai/gpt-4.1-mini',
		name: 'GPT-4.1 Mini',
		provider: 'OpenAI',
		pricing: buildPricing({ input: 0.4, output: 1.6 }),
		context: buildContext(128_000),
		intelligenceLevel: 6,
	},
	'openai/gpt-4.1-nano': {
		key: 'openai/gpt-4.1-nano',
		name: 'GPT-4.1 Nano',
		provider: 'OpenAI',
		pricing: buildPricing({ input: 0.1, output: 0.4 }),
		context: buildContext(128_000),
		intelligenceLevel: 4,
	},
	'openai/gpt-oss-120b': {
		key: 'openai/gpt-oss-120b',
		name: 'GPT OSS 120B',
		provider: 'OpenAI',
		pricing: buildPricing({ input: 0.25, output: 0.75 }),
		context: buildContext(128_000),
		intelligenceLevel: 7,
	},
	'openai/gpt-oss-20b': {
		key: 'openai/gpt-oss-20b',
		name: 'GPT OSS 20B',
		provider: 'OpenAI',
		pricing: buildPricing({ input: 0.1, output: 0.5 }),
		context: buildContext(128_000),
		intelligenceLevel: 5,
	},

	// ==============================
	//             Google
	// ==============================
	'google/gemini-2.5-pro': {
		key: 'google/gemini-2.5-pro',
		name: 'Gemini 2.5 Pro',
		provider: 'Google',
		pricing: buildPricing({ input: 1.25, output: 10 }),
		context: buildContext(1_000_000),
		intelligenceLevel: 8,
	},
	'google/gemini-2.5-flash': {
		key: 'google/gemini-2.5-flash',
		name: 'Gemini 2.5 Flash',
		description: 'Nicely balanced, cheap and fast',
		provider: 'Google',
		pricing: buildPricing({ input: 0.3, output: 2.5 }),
		context: buildContext(1_000_000),
		intelligenceLevel: 6,
	},
	'google/gemini-2.5-flash-lite': {
		key: 'google/gemini-2.5-flash-lite',
		name: 'Gemini 2.5 Flash Lite',
		provider: 'Google',
		pricing: buildPricing({ input: 0.1, output: 0.4 }),
		context: buildContext(1_000_000),
		intelligenceLevel: 5,
	},

	// ==============================
	//              xAI
	// ==============================
	'xai/grok-4.1-fast-non-reasoning': {
		key: 'xai/grok-4.1-fast-non-reasoning',
		name: 'Grok 4.1 Fast',
		description: 'Latest fast model — great cost/performance ratio.',
		provider: 'xAI',
		pricing: buildPricing({ input: 0.2, output: 0.5 }),
		context: buildContext(2_000_000),
		intelligenceLevel: 5,
	},
	'xai/grok-4': {
		key: 'xai/grok-4',
		name: 'Grok 4',
		description: 'Great cost/performance ratio — for daily use.',
		provider: 'xAI',
		pricing: buildPricing({ input: 3, output: 15 }),
		context: buildContext(256_000),
		intelligenceLevel: 5,
	},
	'xai/grok-4-fast-non-reasoning': {
		key: 'xai/grok-4-fast-non-reasoning',
		name: 'Grok 4 Fast',
		description: 'Great cost/performance ratio — for daily use.',
		provider: 'xAI',
		pricing: buildPricing({ input: 0.2, output: 0.5 }),
		context: buildContext(2_000_000),
		intelligenceLevel: 5,
	},
	'xai/grok-code-fast-1': {
		key: 'xai/grok-code-fast-1',
		name: 'Grok Code Fast 1',
		description: 'Great cost/performance ratio — for daily use.',
		provider: 'xAI',
		pricing: buildPricing({ input: 0.2, output: 1.5 }),
		context: buildContext(131_000),
		intelligenceLevel: 5,
	},
	'xai/grok-3': {
		key: 'xai/grok-3',
		name: 'Grok 3',
		provider: 'xAI',
		pricing: buildPricing({ input: 3, output: 15 }),
		context: buildContext(131_000),
		intelligenceLevel: 8,
	},
	'xai/grok-3-mini': {
		key: 'xai/grok-3-mini',
		name: 'Grok 3 Mini',
		description: 'Cheap and fast, can be useful',
		provider: 'xAI',
		pricing: buildPricing({ input: 0.3, output: 0.5 }),
		context: buildContext(131_000),
		intelligenceLevel: 5,
	},

	// ==============================
	//             Groq
	// ==============================
	'groq/qwen3-32b': {
		key: 'groq/qwen3-32b',
		name: 'Qwen 32B',
		description: 'Insanely faaaast, but not very smart',
		provider: 'Groq',
		pricing: buildPricing({ input: 0.29, output: 0.59 }),
		context: buildContext(32_000),
		intelligenceLevel: 4,
	},

	// ==============================
	//           DeepSeek
	// ==============================
	'deepseek/deepseek-v3': {
		key: 'deepseek/deepseek-v3',
		name: 'DeepSeek V3',
		provider: 'DeepSeek',
		pricing: buildPricing({ input: 0.56, output: 1.68 }),
		context: buildContext(128_000),
		intelligenceLevel: 7,
	},

	// ==============================
	//           Moonshot
	// ==============================
	'moonshot/kimi-2': {
		key: 'moonshot/kimi-2',
		name: 'Kimi 2',
		provider: 'Moonshot',
		pricing: buildPricing({ input: 0.6, output: 2.5 }),
		context: buildContext(128_000),
		intelligenceLevel: 7,
	},

	// ==============================
	//           Cerebras
	// ==============================
	'cerebras/qwen3-235b': {
		key: 'cerebras/qwen3-235b',
		name: 'Qwen 235B',
		provider: 'Cerebras',
		pricing: buildPricing({ input: 0, output: 0 }),
		context: buildContext(128_000),
		intelligenceLevel: 8,
	},
	'cerebras/zai-glm-4.6': {
		key: 'cerebras/zai-glm-4.6',
		name: 'GLM 4.6',
		description: 'Faaaaaast',
		provider: 'Cerebras',
		pricing: buildPricing({ input: 2.25, output: 2.75 }),
		context: buildContext(128_000),
		intelligenceLevel: 7,
	},

	// ==============================
	//           DeepInfra
	// ==============================
	'deepinfra/qwen-3-coder': {
		key: 'deepinfra/qwen-3-coder',
		name: 'Qwen 3 Coder',
		provider: 'DeepInfra',
		pricing: buildPricing({ input: 0.4, output: 1.6 }),
		context: buildContext(128_000),
		intelligenceLevel: 7,
	},
	'deepinfra/glm-4.5': {
		key: 'deepinfra/glm-4.5',
		name: 'GLM 4.5',
		provider: 'DeepInfra',
		pricing: buildPricing({ input: 0.6, output: 2.2 }),
		context: buildContext(128_000),
		intelligenceLevel: 6,
	},

	// ==============================
	//          OpenRouter
	// ==============================
	'openrouter/qwen-3-coder': {
		key: 'openrouter/qwen-3-coder',
		name: 'Qwen 3 Coder',
		provider: 'OpenRouter',
		pricing: buildPricing({ input: 0.6, output: 2.5 }),
		context: buildContext(128_000),
		intelligenceLevel: 7,
	},
	'openrouter/GLM-4.5-Air': {
		key: 'openrouter/GLM-4.5-Air',
		name: 'GLM 4.5 Air',
		provider: 'OpenRouter',
		pricing: buildPricing({ input: 0.2, output: 1.1 }),
		context: buildContext(128_000),
		intelligenceLevel: 5,
	},
	'openrouter/GLM-4.5': {
		key: 'openrouter/GLM-4.5',
		name: 'GLM 4.5',
		provider: 'OpenRouter',
		pricing: buildPricing({ input: 0.6, output: 2.2 }),
		context: buildContext(128_000),
		intelligenceLevel: 6,
	},
};

export const intelligenceSchema = z.object({
	key: intelligenceKeys,
	name: z.string(),
	description: z.string().optional(),
	provider: z.string(), // TODO: enforce that this is a valid provider
	pricing: z.object({
		inputPerToken: z.bigint(),
		inputPerMillionToken: z.bigint(),
		outputPerToken: z.bigint(),
		outputPerMillionToken: z.bigint(),
		estimatedPerMillionWords: z.bigint(),
	}),
	context: z.object({
		maxTokens: z.number(),
		maxWords: z.number(),
	}),
	intelligenceLevel: z.number(),
	// TODO: add speed score
	// TODO: add deprecated and deactivated flags
	// TODO: see models.dev for other details to add
});

export type IntelligenceKey = z.infer<typeof intelligenceKeys>;
export type Intelligence = z.infer<typeof intelligenceSchema>;
