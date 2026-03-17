// TODO: move back to AI SDK when possible
// We moved away from AI SDK's transcribe() after finding out it was forcing
// file type to audio/wav, breaking transcription. We spent too many hours on that already.

import { z } from 'zod/v3';
import { action } from 'lib/convex';
import { env } from 'schemas/envSchema';

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
		formData.append('model', 'whisper-large-v3');
		formData.append(
			'prompt',
			"You're transcribing audio for a companion called Meseeks. Please format the output transcription as a structured text, with paragraphs and line breaks, punctuation, etc. Fix misspellings. No title and shit, just text. Make sure to NOT lose any information. It's better to have them unstructured then miss something that was on the original audio. NEVER add extra information into the text, ever. Keep the original language even if the audio mixes languages.",
		);
		formData.append('response_format', 'json');

		const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${env.GROQ_API_KEY}`,
			},
			body: formData,
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Groq transcription failed:', { status: response.status, error: errorText });
			throw new Error(`Transcription failed: ${response.status}`);
		}

		const json = await response.json();
		const result = z.object({ text: z.string() }).parse(json);

		return result.text.trim();
	},
});
