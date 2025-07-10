import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { asBigInt } from '../lib/money';
import { authorSchema } from './authorSchema';

export const skillOwnerSchema = z.union([
	z.literal('built-in'), // built-in to Meseeks
	z.literal('isPro'), // managed by us, offered by third-parties
	zid('users'), // managed by users
]);

export const skillAuthorSchema = z.union([
	authorSchema, // user or meseeks-defined skills
	z.literal('built-in'), // global skills
]);

export const skillKindSchema = z.enum([
	'built-in', //
	'hard',
	'soft',
]);

// TODO: idea: the initial seed is just an action that happens on the onboarding task

export const httpConfigSchema = z.object({
	url: z.string().url(),
	method: z.enum([
		'GET', //
		'POST',
		'PUT',
		'DELETE',
		'PATCH',
	]),
	headers: z.record(z.string()).describe('HTTP headers to send with the request'),
	paramMappings: z.array(
		z.object({
			type: z.enum([
				'search', //
				'header',
				'path',
				'body',
			]),
			source: z.string().describe('the parameter name on inputSchema'),
			target: z
				.string()
				.describe('the parameter name on the URL, header, path, or body, depending on the selected type'),
		}),
	),
	body: z
		.object({
			template: z.record(z.any()).describe('Base JSON object with pre-filled values').optional(),
		})
		.optional(),
});

export const modelsSchema = z.enum([
	//
	// Anthropic
	'anthropic/claude-4-opus',
	'anthropic/claude-3.7-sonnet',
	'anthropic/claude-4-sonnet',
	'anthropic/claude-3.5-haiku',

	// OpenAI
	// 'openai/gpt-4o',
	// 'openai/gpt-4o-mini',
	'openai/gpt-4.1',
	'openai/gpt-4.1-mini',
	'openai/gpt-4.1-nano',

	// Google
	'google/gemini-2.5-pro',
	'google/gemini-2.5-flash',
	'google/gemini-2.5-flash-lite',

	// xAI
	'xai/grok-3',
	'xai/grok-3-mini',

	// Groq
	// 'groq/llama-4-scout',
	// 'groq/llama-4-maverick',
	'groq/qwen3-32b',

	// DeepSeek
	'deepseek/deepseek-v3',

	// Cerebras
	// 'cerebras/qwen3-32b',

	// DeepInfra
	// 'deepinfra/deepseek-v3',

	// Together
	// 'together/llama-4-maverick',
]);

function pricePerMillionTokens({ input, output }: { input: number; output: number }) {
	return {
		inputToken: asBigInt({ dollars: input }) / 1_000_000n,
		outputToken: asBigInt({ dollars: output }) / 1_000_000n,
	};
}

export function pricingFor(model: z.infer<typeof modelsSchema>): {
	inputToken: bigint;
	outputToken: bigint;
} {
	switch (model) {
		//
		// Anthropic
		case 'anthropic/claude-4-opus':
			return pricePerMillionTokens({ input: 15, output: 75 });
		case 'anthropic/claude-4-sonnet':
		case 'anthropic/claude-3.7-sonnet':
			return pricePerMillionTokens({ input: 3, output: 15 });
		case 'anthropic/claude-3.5-haiku':
			return pricePerMillionTokens({ input: 0.8, output: 4 });

		// OpenAI
		// case 'openai/gpt-4o':
		// 	return pricePerMillionTokens({ input: 2.5, output: 10 });
		// case 'openai/gpt-4o-mini':
		// 	return pricePerMillionTokens({ input: 0.15, output: 0.6 });
		case 'openai/gpt-4.1':
			return pricePerMillionTokens({ input: 2.0, output: 8.0 });
		case 'openai/gpt-4.1-mini':
			return pricePerMillionTokens({ input: 0.4, output: 1.6 });
		case 'openai/gpt-4.1-nano':
			return pricePerMillionTokens({ input: 0.1, output: 0.4 });

		// Google
		case 'google/gemini-2.5-pro':
			return pricePerMillionTokens({ input: 2.5, output: 15 });
		case 'google/gemini-2.5-flash':
			return pricePerMillionTokens({ input: 0.1, output: 0.6 });
		case 'google/gemini-2.5-flash-lite':
			return pricePerMillionTokens({ input: 0.075, output: 0.3 });

		// xAI
		case 'xai/grok-3':
			return pricePerMillionTokens({ input: 3, output: 15 });
		case 'xai/grok-3-mini':
			return pricePerMillionTokens({ input: 0.3, output: 0.5 });

		// Groq
		// case 'groq/llama-4-scout':
		// 	return pricePerMillionTokens({ input: 0.11, output: 0.34 });
		// case 'groq/llama-4-maverick':
		// 	return pricePerMillionTokens({ input: 0.2, output: 0.6 });
		case 'groq/qwen3-32b':
			return pricePerMillionTokens({ input: 0.29, output: 0.59 });

		// DeepSeek
		case 'deepseek/deepseek-v3':
			return pricePerMillionTokens({ input: 0.27, output: 1.1 });

		// Cerebras
		// case 'cerebras/qwen3-32b':
		// 	return pricePerMillionTokens({ input: 0, output: 0 });
		// DeepInfra
		// case 'deepinfra/deepseek-v3':
		// 	return pricePerMillionTokens({ input: 0.4, output: 0.89 });

		// Together
		// case 'together/llama-4-maverick':
		// 	return pricePerMillionTokens({ inputPrice: 0.27, outputPrice: 0.85 });

		default:
			throw new Error(`Unknown model: ${model}`);
	}
}

export const instructionVariableSchema = z.union([
	z.literal('task').describe('The full task structure, in a XML-like format'),
	z.literal('task.id'),
	z.literal('task.title'),
	z.literal('task.status'),
	z.literal('task.createdAt'),
	z.literal('task.lastUpdatedAt'),
	z.literal('task.instructions'),
	z.literal('task.summary'),
	z.literal('task.parent'),
	z.literal('task.energyBudget').describe('The full task budget structure, in a XML-like format'),
	z.literal('task.energyBudget.total'),
	z.literal('task.energyBudget.spent'),
	z.literal('task.energyBudget.available'),
	z.literal('taskSchedules').describe('List of active schedules for the current task, in a XML-like format'),
	z.literal('currentDate').describe('The current date and time in ISO 8601 format'),
	z.literal('userInfo').describe('Information about the user, written by themself'),
	z.literal('allSkills').describe('A list of all existing skills.'),
	z.literal('activeTasks').describe('A list of all active tasks ordered by total budget (highest first).'),
	z
		.string()
		.regex(/^input\..+$/)
		.describe('Access to action input arguments using input.argName format'),
]);

export const decisionConfigSchema = z.object({
	model: modelsSchema.or(z.literal('auto')),
	instructions: z.string().describe('Instructions for the decision-making process'),
	temperature: z.number().min(0).max(2).describe('Temperature to use'),
	availableSkills: z.array(z.string()).describe('Skills that can be used to make the decision'),
	historyMode: z.enum([
		// 'none', //
		'since last instructed',
		'all',
	]),
	topP: z
		.number()
		.min(0)
		.max(1)
		.optional()
		.describe(
			'Nucleus sampling. This is a number between 0 and 1. E.g. 0.1 would mean that only tokens with the top 10% probability mass are considered. It is recommended to set either `temperature` or `topP`, but not both.',
		),
	topK: z
		.number()
		.optional()
		.describe(
			'Only sample from the top K options for each subsequent token. Only sample from the top K options for each subsequent token. Used to remove "long tail" low probability responses. Recommended for advanced use cases only. Usually `temperature` is enough.',
		),
	maxTokens: z
		.number() //
		.optional()
		.describe('Maximum number of tokens to use'),
	maxRetries: z
		.number()
		.optional()
		.describe('Maximum number of (AI SDK internal) retries. Set to 0 to disable retries.'),
	frequencyPenalty: z
		.number()
		.min(-1)
		.max(1)
		.optional()
		.describe(
			`Affects the likelihood of the model to repeatedly use the same words or phrases. Is a number between -1 (increase repetition) and 1 (maximum penalty, decrease repetition). 0 means no penalty.`,
		),
	stopSequences: z
		.array(z.string())
		.optional()
		.describe(
			'If set, the model will stop generating text when one of the stop sequences is generated. Providers may have limits on the number of stop sequences.',
		),
	seed: z
		.number()
		.optional()
		.describe(
			'The seed (integer) to use for random sampling. If set and supported by the model, calls will generate deterministic results.',
		),
});

const coreSkillSchema = z.object({
	key: z.string(),
	description: z.string(),
	inputSchema: z.string(), // TODO: enforce that this is a valid zod schema
	// outputSchema?: z.string(), // not yet
	preApprovedCost: z.union([
		z.literal('none'),
		z
			.bigint()
			.min(asBigInt({ dollars: 0 }))
			.max(asBigInt({ dollars: 1000 }))
			.describe(
				'If the expected cost is less than or equal to this amount (pre-approved cost), it will be automatically authorized to execute. If can be set to "none" to disable pre-approval at all, forcing a human-approval before execution.',
			),
	]),
	knownReactions: z
		.array(
			z.object({
				skillKey: z.string().describe('The key of the skill to use'),
				args: z.record(z.any()),
				condition: z.enum([
					'owner', // only react if the author is the owner
					'companion', // only react if the author is a an action (i.e. companion did it)
					'any', // always react
				]),
			}),
		)
		.optional()
		.describe('Pre-configured actions that will happen as a re-action to the use of this skill.'),
	kind: skillKindSchema,
	owner: skillOwnerSchema,
	author: skillAuthorSchema,
});

export const builtInSkillSchema = coreSkillSchema.extend({
	kind: z.literal('built-in'),
	owner: z.literal('built-in'),
	author: z.literal('built-in'),
	cost: z.literal(0n).describe('Built-in skills are free of charge.'),
});

export const hardSkillSchema = coreSkillSchema.extend({
	kind: z.literal('hard'),
	cost: z
		.bigint() //
		.min(asBigInt({ dollars: 0 }))
		.max(asBigInt({ dollars: 1000 }))
		.describe('The cost to use this skill, in energy.'),
	config: httpConfigSchema,
});

export const softSkillSchema = coreSkillSchema.extend({
	kind: z.literal('soft'),
	cost: z
		.literal('dynamic')
		.describe(
			'The cost to use this skill, in energy. Dynamic cost means it will be known during usage. Budget is still accounted before execution.',
		),
	config: decisionConfigSchema,
});

export const skillSchema = z
	.union([
		builtInSkillSchema, //
		hardSkillSchema,
		softSkillSchema,
	])
	.describe(
		'A Skill is an external API call (service or LLM) that can be used by the user or Meseeks.', //
	);

export const newSkillSchema = z.union([
	hardSkillSchema.omit({ author: true, owner: true }), //
	softSkillSchema.omit({ author: true, owner: true }),
]);

// Instincts/built-in skills
// speak()
// createTask()
// markAsDone()
// ...

// // managed by us, offered by third-parties
// react()
// learn()
// searchWeb()
// scrapeTweet()
// ...

// // managed by you
// ...

// ------------------------------------
// ------------------------------------
// ------------------------------------

export const simplifiedSkillKindSchema = z.enum(['hard', 'soft']);

export const simplifiedDecisionConfigSchema = z.object({
	instructions: z.string().describe('Instructions for the decision-making process'),
	temperature: z.number().min(0).max(2).describe('Temperature to use'),
	availableSkills: z.array(z.string()).describe('Skills that can be used to make the decision'),
});

const simplifiedCoreSkillSchema = z.object({
	key: z.string(),
	description: z.string(),
	inputSchema: z.string(), // TODO: enforce that this is a valid zod schema
	isSafe: z.boolean(),
	knownReactions: z
		.array(z.string().describe('The key of the skill to use'))
		.optional()
		.describe('Pre-configured actions that will happen as a re-action to the use of this skill.'),
	kind: simplifiedSkillKindSchema,
});

export const simplifiedHttpConfigSchema = z.object({
	url: z.string(),
	method: z.enum([
		'GET', //
		'POST',
		'PUT',
		'DELETE',
		'PATCH',
	]),
	headers: z.record(z.string()).describe('HTTP headers to send with the request').optional(),
	paramMappings: z.array(
		z.object({
			type: z.enum([
				'search', //
				'header',
				'path',
				'body',
			]),
			source: z.string().describe('the parameter name on inputSchema'),
			target: z
				.string()
				.describe(
					'the parameter name on the URL, header, path, or body, depending on the selected type. For `path` params, they should appear at the URL as `https://example.com/path/:param1/:param2`.',
				),
		}),
	),
	body: z
		.object({
			template: z.record(z.any()).describe('Base JSON object with pre-filled values').optional(),
		})
		.optional(),
});

export const simplifiedHardSkillSchema = simplifiedCoreSkillSchema.extend({
	kind: z.literal('hard'),
	config: simplifiedHttpConfigSchema,
});

export const simplifiedSoftSkillSchema = simplifiedCoreSkillSchema.extend({
	kind: z.literal('soft'),
	config: simplifiedDecisionConfigSchema,
});

// Simplified skill schema for the learn() skill TODO: organize better
export const simplifiedSkillSchema = z.union([simplifiedHardSkillSchema, simplifiedSoftSkillSchema]);
