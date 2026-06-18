import { z } from 'zod/v3';
import { asBigInt } from 'lib/money';

// TODO: dynamic read from models.dev

// TODO: move those into env vars
const TOKEN_TO_WORD_RATIO = 0.75; // 1 token ≈ 0.75 words
const WORD_TO_TOKEN_RATIO = 1 / TOKEN_TO_WORD_RATIO; // 1 word ≈ 1.333 tokens
const INPUT_COST_WEIGHT = 80n; // input weights for ≈80% of the cost
const OUTPUT_COST_WEIGHT = 20n; // output weights for ≈20% of the cost

export const intelligenceKeys = z.enum([
	'deepseek/deepseek-v4-flash',
	'deepseek/deepseek-v4-pro',
	'moonshot/kimi-k2.5',
	'moonshot/kimi-k2.6',
	'openai/gpt-5.5',
	'openai/gpt-5.5-pro',
	'openai/gpt-5.4-mini',
]);

export type IntelligenceKey = z.infer<typeof intelligenceKeys>;

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

export const DEFAULT_INTELLIGENCE: IntelligenceKey = 'deepseek/deepseek-v4-flash';

// dynamically chooses the intelligence to use based on the available energy
export const INTELLIGENCE_PROGRESSION: Partial<Record<IntelligenceKey, number>> = {
	'deepseek/deepseek-v4-flash': 0.2,
	'moonshot/kimi-k2.5': 50.0,
	'openai/gpt-5.5-pro': Number.POSITIVE_INFINITY,
};

export const INTELLIGENCES: Record<IntelligenceKey, Intelligence> = {
	'deepseek/deepseek-v4-flash': {
		key: 'deepseek/deepseek-v4-flash',
		name: 'DeepSeek V4 Flash',
		provider: 'DeepSeek',
		pricing: buildPricing({ input: 0.14, output: 0.28 }),
		context: buildContext(1_000_000),
		intelligenceLevel: 6,
	},
	'deepseek/deepseek-v4-pro': {
		key: 'deepseek/deepseek-v4-pro',
		name: 'DeepSeek V4 Pro',
		provider: 'DeepSeek',
		pricing: buildPricing({ input: 0.435, output: 0.87 }),
		context: buildContext(1_000_000),
		intelligenceLevel: 8,
	},
	'moonshot/kimi-k2.5': {
		key: 'moonshot/kimi-k2.5',
		name: 'Kimi K2.5',
		provider: 'Moonshot',
		pricing: buildPricing({ input: 0.6, output: 3 }),
		context: buildContext(250_000),
		intelligenceLevel: 9,
	},
	'moonshot/kimi-k2.6': {
		key: 'moonshot/kimi-k2.6',
		name: 'Kimi K2.6',
		provider: 'Moonshot',
		pricing: buildPricing({ input: 0.6, output: 3 }),
		context: buildContext(250_000),
		intelligenceLevel: 9,
	},
	'openai/gpt-5.5': {
		key: 'openai/gpt-5.5',
		name: 'GPT 5.5',
		provider: 'OpenAI',
		pricing: buildPricing({ input: 5, output: 30 }),
		context: buildContext(250_000),
		intelligenceLevel: 8,
	},
	'openai/gpt-5.5-pro': {
		key: 'openai/gpt-5.5-pro',
		name: 'GPT 5.5 Pro',
		provider: 'OpenAI',
		pricing: buildPricing({ input: 15, output: 75 }),
		context: buildContext(250_000),
		intelligenceLevel: 10,
	},
	'openai/gpt-5.4-mini': {
		key: 'openai/gpt-5.4-mini',
		name: 'GPT 5.4 mini',
		provider: 'OpenAI',
		pricing: buildPricing({ input: 0.25, output: 2 }),
		context: buildContext(128_000),
		intelligenceLevel: 7,
	},
};

export const intelligenceSchema = z.object({
	key: intelligenceKeys,
	name: z.string(),
	description: z.string().optional(),
	provider: z.enum(['DeepSeek', 'Moonshot', 'OpenAI']),
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

export type Intelligence = z.infer<typeof intelligenceSchema>;
