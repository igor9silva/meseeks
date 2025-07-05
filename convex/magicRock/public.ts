// TODO: move back to AI SDK when possible
// We moved away from AI SDK's transcribe() after finding out it was forcing
// file type to audio/wav, breaking transcription. We spent too many hours on that already.

import { getAuthUserId } from '@convex-dev/auth/server';
import { z } from 'zod';
import { action } from '../lib';
import { env } from '../schemas/envSchema';

export const transcribe = action({
	args: {
		audio: z.instanceof(ArrayBuffer),
	},
	handler: async (ctx, { audio }) => {
		//
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');

		const audioBlob = new Blob([audio]);
		const file = new File([audioBlob], 'recording.webm');

		const formData = new FormData();
		formData.append('file', file);
		formData.append('model', 'whisper-large-v3');
		formData.append('prompt', "You're transcribing audio for a companion called Meseeks.");
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
