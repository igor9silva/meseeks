import { z } from 'zod/v3';
import { asBigInt } from 'lib/money';

const TOKEN_TO_WORD_RATIO = 0.75;
const WORD_TO_TOKEN_RATIO = 1 / TOKEN_TO_WORD_RATIO;
const INPUT_COST_WEIGHT = 80n;
const OUTPUT_COST_WEIGHT = 20n;

const buildContext = (maxTokens: number) => ({
	maxTokens,
	maxWords: Math.round(maxTokens * TOKEN_TO_WORD_RATIO),
});

const buildPricing = ({ input, output }: { input: number; output: number }) => {
	//
	const inputPerToken = asBigInt({ dollars: input }) / 1_000_000n;
	const outputPerToken = asBigInt({ dollars: output }) / 1_000_000n;
	const inputPerMillionToken = inputPerToken * 1_000_000n;
	const outputPerMillionToken = outputPerToken * 1_000_000n;
	const weightedInputCost = (inputPerMillionToken * INPUT_COST_WEIGHT) / 100n;
	const weightedOutputCost = (outputPerMillionToken * OUTPUT_COST_WEIGHT) / 100n;
	const estimatedCostPerMillion = weightedInputCost + weightedOutputCost;
	const tokensPerMillionWords = BigInt(Math.round(WORD_TO_TOKEN_RATIO * 1_000_000));
	const estimatedPerMillionWords = (estimatedCostPerMillion * tokensPerMillionWords) / 1_000_000n;

	return {
		inputPerToken,
		inputPerMillionToken,
		outputPerToken,
		outputPerMillionToken,
		estimatedPerMillionWords,
	};
};

export const concreteIntelligenceKeys = z.enum([
	'deepseek/deepseek-v4-flash',
	'deepseek/deepseek-v4-pro',
	'moonshot/kimi-k2.5',
	'moonshot/kimi-k2.6',
	'openai/gpt-5.4-mini',
	'openai/gpt-5.5',
	'openai/gpt-5.5-pro',
]);

export type ConcreteIntelligenceKey = z.infer<typeof concreteIntelligenceKeys>;

export const intelligenceKeys = z.enum([
	'Cheap',
	'Efficient',
	'Genius',
	'deepseek/deepseek-v4-flash',
	'deepseek/deepseek-v4-pro',
	'moonshot/kimi-k2.5',
	'moonshot/kimi-k2.6',
	'openai/gpt-5.4-mini',
	'openai/gpt-5.5',
	'openai/gpt-5.5-pro',
]);

export type IntelligenceKey = z.infer<typeof intelligenceKeys>;

export const DEFAULT_INTELLIGENCE: IntelligenceKey = 'Cheap';
export const RECOMMENDED_INTELLIGENCE_KEYS: IntelligenceKey[] = ['Cheap', 'Efficient', 'Genius'];

export const intelligenceProviderSchema = z.object({
	provider: z.enum(['deepseek', 'moonshot', 'openai']),
	intelligence: z.string().min(1),
});

const intelligencePricingSchema = z.object({
	inputPerToken: z.bigint(),
	inputPerMillionToken: z.bigint(),
	outputPerToken: z.bigint(),
	outputPerMillionToken: z.bigint(),
	estimatedPerMillionWords: z.bigint(),
});

const intelligenceContextSchema = z.object({
	maxTokens: z.number(),
	maxWords: z.number(),
});

export const intelligenceSchema = z.object({
	key: intelligenceKeys,
	name: z.string().min(1),
	description: z.string().optional(),
	target: concreteIntelligenceKeys.optional(),
	providerName: z.string().min(1).optional(),
	provider: intelligenceProviderSchema.optional(),
	pricing: intelligencePricingSchema.optional(),
	context: intelligenceContextSchema.optional(),
	intelligenceLevel: z.number().optional(),
	budgetCeiling: z.bigint().nullable().optional(),
	deprecatedAt: z.number().optional(),
	deactivatedAt: z.number().optional(),
});

export type Intelligence = z.infer<typeof intelligenceSchema>;

const concreteIntelligenceSchema = intelligenceSchema.extend({
	key: concreteIntelligenceKeys,
	providerName: z.string().min(1),
	provider: intelligenceProviderSchema,
	pricing: intelligencePricingSchema,
	context: intelligenceContextSchema,
	intelligenceLevel: z.number(),
	target: z.undefined().optional(),
});

export type ConcreteIntelligence = z.infer<typeof concreteIntelligenceSchema>;

export const INTELLIGENCES = {
	'Cheap': intelligenceSchema.parse({
		key: 'Cheap',
		name: 'Cheap',
		description: 'Small, fast, inexpensive intelligence for light work.',
		target: 'deepseek/deepseek-v4-flash',
		budgetCeiling: asBigInt({ dollars: 1 }),
	}),
	'Efficient': intelligenceSchema.parse({
		key: 'Efficient',
		name: 'Efficient',
		description: 'Default workhorse intelligence for most PRO work.',
		target: 'moonshot/kimi-k2.5',
		budgetCeiling: asBigInt({ dollars: 5 }),
	}),
	'Genius': intelligenceSchema.parse({
		key: 'Genius',
		name: 'Genius',
		description: 'Highest quality intelligence for complex reasoning.',
		target: 'openai/gpt-5.5',
		budgetCeiling: null,
	}),
	'deepseek/deepseek-v4-flash': concreteIntelligenceSchema.parse({
		key: 'deepseek/deepseek-v4-flash',
		name: 'DeepSeek V4 Flash',
		providerName: 'DeepSeek',
		provider: {
			provider: 'deepseek',
			intelligence: 'deepseek-v4-flash',
		},
		pricing: buildPricing({ input: 0.14, output: 0.28 }),
		context: buildContext(1_000_000),
		intelligenceLevel: 6,
	}),
	'deepseek/deepseek-v4-pro': concreteIntelligenceSchema.parse({
		key: 'deepseek/deepseek-v4-pro',
		name: 'DeepSeek V4 Pro',
		providerName: 'DeepSeek',
		provider: {
			provider: 'deepseek',
			intelligence: 'deepseek-v4-pro',
		},
		pricing: buildPricing({ input: 0.435, output: 0.87 }),
		context: buildContext(1_000_000),
		intelligenceLevel: 8,
	}),
	'moonshot/kimi-k2.5': concreteIntelligenceSchema.parse({
		key: 'moonshot/kimi-k2.5',
		name: 'Kimi K2.5',
		providerName: 'Moonshot',
		provider: {
			provider: 'moonshot',
			intelligence: 'kimi-k2.5',
		},
		pricing: buildPricing({ input: 0.6, output: 3 }),
		context: buildContext(250_000),
		intelligenceLevel: 9,
	}),
	'moonshot/kimi-k2.6': concreteIntelligenceSchema.parse({
		key: 'moonshot/kimi-k2.6',
		name: 'Kimi K2.6',
		providerName: 'Moonshot',
		provider: {
			provider: 'moonshot',
			intelligence: 'kimi-k2.6',
		},
		pricing: buildPricing({ input: 0.6, output: 3 }),
		context: buildContext(250_000),
		intelligenceLevel: 9,
	}),
	'openai/gpt-5.4-mini': concreteIntelligenceSchema.parse({
		key: 'openai/gpt-5.4-mini',
		name: 'GPT 5.4 Mini',
		providerName: 'OpenAI',
		provider: {
			provider: 'openai',
			intelligence: 'gpt-5.4-mini',
		},
		pricing: buildPricing({ input: 0.25, output: 2 }),
		context: buildContext(128_000),
		intelligenceLevel: 7,
	}),
	'openai/gpt-5.5': concreteIntelligenceSchema.parse({
		key: 'openai/gpt-5.5',
		name: 'GPT 5.5',
		providerName: 'OpenAI',
		provider: {
			provider: 'openai',
			intelligence: 'gpt-5.5',
		},
		pricing: buildPricing({ input: 5, output: 30 }),
		context: buildContext(250_000),
		intelligenceLevel: 8,
	}),
	'openai/gpt-5.5-pro': concreteIntelligenceSchema.parse({
		key: 'openai/gpt-5.5-pro',
		name: 'GPT 5.5 Pro',
		providerName: 'OpenAI',
		provider: {
			provider: 'openai',
			intelligence: 'gpt-5.5-pro',
		},
		pricing: buildPricing({ input: 10, output: 60 }),
		context: buildContext(250_000),
		intelligenceLevel: 10,
	}),
} satisfies Record<IntelligenceKey, Intelligence>;

export function referenceIntelligence(args: { key: string }) {
	//
	const parsed = intelligenceKeys.safeParse(args.key);
	if (!parsed.success) throw new Error(`Unknown intelligence ${args.key}`);

	return INTELLIGENCES[parsed.data];
}

export function referenceConcreteIntelligence(args: { key: string }) {
	//
	const intelligence = referenceIntelligence(args);
	const concreteKey = intelligence.target ?? intelligence.key;
	const parsed = concreteIntelligenceKeys.safeParse(concreteKey);
	if (!parsed.success) throw new Error(`Intelligence ${args.key} does not resolve to a concrete provider.`);

	return concreteIntelligenceSchema.parse(INTELLIGENCES[parsed.data]);
}

export function referenceIntelligenceSelection(args: { key: string }) {
	//
	const intelligence = referenceIntelligence(args);
	const concrete = referenceConcreteIntelligence({ key: intelligence.key });

	return {
		key: intelligence.key,
		label: intelligence.name,
		intelligence: concrete.key,
		provider: concrete.provider,
		budgetCeiling: intelligence.budgetCeiling ?? null,
		deprecatedAt: intelligence.deprecatedAt ?? concrete.deprecatedAt,
		deactivatedAt: intelligence.deactivatedAt ?? concrete.deactivatedAt,
	};
}

export function displayIntelligence(args: { key: IntelligenceKey }) {
	//
	const intelligence = INTELLIGENCES[args.key];
	const concrete = referenceConcreteIntelligence({ key: args.key });

	return {
		...intelligence,
		providerName: concrete.providerName,
		provider: concrete.provider,
		pricing: concrete.pricing,
		context: concrete.context,
		intelligenceLevel: concrete.intelligenceLevel,
		deprecatedAt: intelligence.deprecatedAt ?? concrete.deprecatedAt,
		deactivatedAt: intelligence.deactivatedAt ?? concrete.deactivatedAt,
	};
}

export type DisplayIntelligence = ReturnType<typeof displayIntelligence>;

export function estimateIntelligenceCost(args: { intelligence: string; inputTokens: number; outputTokens: number }) {
	//
	const concrete = referenceConcreteIntelligence({ key: args.intelligence });
	const input = (concrete.pricing.inputPerMillionToken * BigInt(args.inputTokens)) / 1_000_000n;
	const output = (concrete.pricing.outputPerMillionToken * BigInt(args.outputTokens)) / 1_000_000n;
	const amount = input + output;
	if (amount <= 0n) return undefined;

	return {
		symbol: 'USD',
		amount,
		description: `${args.intelligence} usage`,
	};
}
