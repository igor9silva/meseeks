// TODO: move back to AI SDK when possible
// We moved away from AI SDK's transcribe() after finding out it was forcing
// file type to audio/wav, breaking transcription. We spent too many hours on that already.

import { z } from 'zod/v3';
import { action } from 'lib/convex';
import { env } from 'schemas/envSchema';

const dictionary = [
	'Meseeks', //
	'DeepSeek',
	'GPT',
].join(',');

const baseUrl = 'https://api.mistral.ai/v1';
const model = 'voxtral-mini-latest';

const audioArrayBufferSchema = z.unknown().transform((value, ctx) => {
	//
	if (value instanceof ArrayBuffer) return value;

	ctx.addIssue({
		code: z.ZodIssueCode.custom,
		message: 'Expected an ArrayBuffer',
	});

	return z.NEVER;
});

const audioContentTypeSchema = z
	.string()
	.trim()
	.max(100)
	.regex(/^audio\/[a-z0-9.+-]+(?:;.*)?$/i)
	.optional();

export const transcribe = action({
	args: {
		audio: audioArrayBufferSchema,
		contentType: audioContentTypeSchema,
	},
	handler: async (ctx, { audio, contentType }) => {
		//
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');

		const audioBlob = new Blob([audio], { type: contentType ?? 'audio/webm' });
		const file = new File([audioBlob], 'recording.webm', { type: audioBlob.type });

		const formData = new FormData();
		formData.append('file', file);
		formData.append('model', model);
		formData.append('context_bias', dictionary);
		formData.append('temperature', '0');

		const response = await fetch(`${baseUrl}/audio/transcriptions`, {
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

		console.debug('Transcription result', {
			model,
			baseUrl,
			characterCount: transcription.length,
			contextBias: dictionary,
			text: transcription,
		});

		return transcription;
	},
});
