'use node';

import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, type LanguageModel } from 'ai';
import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { getTrustedIntelligence, type TrustedIntelligence } from 'lib/intelligences';
import { env } from 'schemas/envSchema';

const deepseek = createDeepSeek({
	apiKey: env.DEEPSEEK_API_KEY,
});

const moonshot = createOpenAICompatible({
	name: 'moonshot',
	apiKey: env.MOONSHOT_API_KEY,
	baseURL: 'https://api.moonshot.ai/v1',
});

const openai = createOpenAI({
	apiKey: env.OPENAI_API_KEY,
});

const instantiateLanguageModel = (intelligence: TrustedIntelligence) => {
	if (intelligence.provider === 'deepseek') {
		return deepseek(intelligence.model);
	}

	if (intelligence.provider === 'moonshot') {
		return moonshot(intelligence.model);
	}

	return openai(intelligence.model);
};

const languageModelFor = (
	intelligenceKey: string,
): {
	provider: TrustedIntelligence['provider'];
	model: string;
	languageModel: LanguageModel;
} => {
	const intelligence = getTrustedIntelligence(intelligenceKey);
	if (intelligence) {
		return {
			provider: intelligence.provider,
			model: intelligence.model,
			languageModel: instantiateLanguageModel(intelligence),
		};
	}

	throw new Error(
		`Unsupported PRO intelligence "${intelligenceKey}". This MVP does not route one provider through another.`,
	);
};

export const runThink = async (
	ctx: ActionCtx,
	{
		owner,
		directory,
		actionId,
		intelligenceKey,
		prompt,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		actionId: Id<'actions'>;
		intelligenceKey: string;
		prompt: string;
	},
) => {
	if (!getTrustedIntelligence(intelligenceKey)) {
		throw new Error(`Unsupported PRO intelligence "${intelligenceKey}".`);
	}

	const selected = languageModelFor(intelligenceKey);
	const result = await generateText({
		model: selected.languageModel,
		system: 'You are PRO, a personal operating substrate for AI work. Be concise and return useful directory-facing output.',
		prompt,
		providerOptions:
			selected.provider === 'moonshot' || selected.provider === 'deepseek'
				? { [selected.provider]: { thinking: { type: 'disabled' } } }
				: undefined,
	});

	await ctx.runMutation(internal.actions._recordDetail, {
		detail: {
			action: actionId,
			owner,
			directory,
			kind: 'think',
			provider: selected.provider,
			model: selected.model,
			prompt,
			output: result.text,
			usage: {
				inputTokens: result.usage.inputTokens,
				outputTokens: result.usage.outputTokens,
				totalTokens: result.usage.totalTokens,
			},
			warnings: (result.warnings ?? []).map((warning) => JSON.stringify(warning)),
			createdAt: Date.now(),
		},
	});

	return result.text;
};
