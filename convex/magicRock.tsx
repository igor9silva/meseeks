// TODO: move back to AI SDK when possible
// We moved away from AI SDK's transcribe() after finding out it was forcing
// file type to audio/wav, breaking transcription. We spent too many hours on that already.

import { generateText } from 'ai';
import { z } from 'zod/v3';
import { action } from 'lib/convex';
import { env } from 'schemas/envSchema';
import { languageModelFrom } from './magicRock.private';

const dictionary = [
	'Meseeks', //
].join(',');

const cleanupPrompt = `
format this raw transcript into readable text.

return only the formatted transcript.
no title, no intro, no markdown, no explanations.

rules:
- preserve the original words and meaning
- do not translate
- do not add or remove information
- add punctuation and paragraph breaks only
- lightly fix obvious spelling mistakes when the intent is clear
- if unsure, keep the original wording
`.trim();

const audioArrayBufferSchema = z.unknown().transform((value, ctx) => {
	//
	if (value instanceof ArrayBuffer) return value;

	ctx.addIssue({
		code: z.ZodIssueCode.custom,
		message: 'Expected an ArrayBuffer',
	});

	return z.NEVER;
});

export const transcribe = action({
	args: {
		audio: audioArrayBufferSchema,
	},
	handler: async (ctx, { audio }) => {
		//
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');

		const audioBlob = new Blob([audio]);
		const file = new File([audioBlob], 'recording.webm');

		const formData = new FormData();
		formData.append('file', file);
		formData.append('model', 'voxtral-mini-latest');
		formData.append('context_bias', dictionary);

		const response = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
			},
			body: formData,
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Mistral transcription failed:', { status: response.status, error: errorText });
			throw new Error(`Transcription failed: ${response.status}`);
		}

		const json = await response.json();
		const result = z.object({ text: z.string() }).parse(json);
		const transcription = result.text.trim();

		console.info('Mistral transcription result', {
			characterCount: transcription.length,
			contextBias: dictionary,
			text: transcription,
		});

		if (!transcription) return transcription;

		try {
			const cleanupResult = await generateText({
				model: languageModelFrom('openai/gpt-oss-20b'),
				temperature: 0,
				system: cleanupPrompt,
				prompt: `format this transcript:\n\n${transcription}`,
			});

			const cleanedTranscription = cleanupResult.text.trim();

			console.info('Transcription cleanup result', {
				model: 'openai/gpt-oss-20b',
				characterCount: cleanedTranscription.length,
				text: cleanedTranscription,
				finishReason: cleanupResult.finishReason,
				usage: cleanupResult.usage,
				warnings: cleanupResult.warnings,
			});

			if (!cleanedTranscription) {
				console.warn('Transcription cleanup returned empty text, falling back to raw transcription.');
				return transcription;
			}

			return cleanedTranscription;
		} catch (error) {
			console.warn('Transcription cleanup failed, falling back to raw transcription.', error);
			return transcription;
		}
	},
});
