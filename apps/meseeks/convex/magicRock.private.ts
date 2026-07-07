import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, type LanguageModel } from 'ai';
import { z } from 'zod/v3';
import {
	DEFAULT_INTELLIGENCE,
	INTELLIGENCES,
	intelligenceKeys,
	type IntelligenceKey,
} from 'schemas/intelligenceSchema';
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

type SelectedModel = {
	intelligence: IntelligenceKey;
	provider: string;
	model: string;
	languageModel: LanguageModel;
};

export const magicRockPreparationSchema = z.object({
	intelligence: intelligenceKeys,
	provider: z.string().min(1),
	model: z.string().min(1),
	system: z.string().min(1),
	prompt: z.string().min(1),
	estimated: z.record(z.unknown()).optional(),
	warnings: z.array(z.string()).optional(),
});

export type MagicRockPreparation = z.infer<typeof magicRockPreparationSchema>;

export function prepareMagicRock({
	intelligence = DEFAULT_INTELLIGENCE,
	prompt,
}: {
	intelligence?: IntelligenceKey;
	prompt: string;
}): MagicRockPreparation {
	//
	const selected = selectModel(intelligence);

	return {
		intelligence: selected.intelligence,
		provider: selected.provider,
		model: selected.model,
		system: 'You are PRO. Return concise, useful MDX for the current directory.',
		prompt,
	};
}

export async function askMagicRock(preparation: MagicRockPreparation) {
	//
	const parsed = magicRockPreparationSchema.parse(preparation);
	const selected = selectModel(parsed.intelligence);
	const result = await generateText({
		model: selected.languageModel,
		system: parsed.system,
		prompt: parsed.prompt,
		providerOptions:
			selected.provider === 'DeepSeek' || selected.provider === 'Moonshot'
				? { [selected.provider.toLowerCase()]: { thinking: { type: 'disabled' } } }
				: undefined,
	});

	return {
		text: result.text,
		provider: selected.provider,
		model: selected.model,
		usage: {
			inputTokens: result.usage.inputTokens,
			outputTokens: result.usage.outputTokens,
			totalTokens: result.usage.totalTokens,
		},
		warnings: (result.warnings ?? []).map((warning) => JSON.stringify(warning)),
	};
}

function selectModel(intelligence: IntelligenceKey): SelectedModel {
	//
	const definition = INTELLIGENCES[intelligence];
	const model = intelligence.split('/')[1];

	if (!model) {
		throw new Error(`Invalid intelligence key: ${intelligence}`);
	}

	if (definition.provider === 'DeepSeek') {
		return {
			intelligence,
			provider: definition.provider,
			model,
			languageModel: deepseek(model),
		};
	}

	if (definition.provider === 'Moonshot') {
		return {
			intelligence,
			provider: definition.provider,
			model,
			languageModel: moonshot(model),
		};
	}

	return {
		intelligence,
		provider: definition.provider,
		model,
		languageModel: openai(model),
	};
}
