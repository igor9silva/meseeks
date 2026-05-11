import { z } from 'zod/v3';
import { action } from 'lib/convex';
import { env } from 'schemas/envSchema';

const baseDictionary = [
	'Meseeks',
	'Convex',
	'TanStack',
	'TanStack Router',
	'Vite',
	'Bun',
	'React',
	'TypeScript',
	'OpenAI',
	'Realtime',
	'Whisper',
	'DeepSeek',
	'Qwen',
	'Claude',
	'Gemini',
	'GPT',
];

const baseUrl = 'https://api.openai.com/v1';
const realtimeModel = 'gpt-realtime-whisper';
const fallbackModel = 'gpt-4o-transcribe';
const maxAudioBytes = 25 * 1024 * 1024;
const maxPromptCharacters = 1800;

const audioArrayBufferSchema = z.unknown().transform((value, ctx) => {
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

const promptContextSchema = z.string().trim().max(2000).optional();
const dictionarySchema = z.array(z.string().trim().min(1).max(80)).max(100).optional();
const sdpSchema = z.string().trim().min(1).max(100_000);

const languageSchema = z
	.string()
	.trim()
	.min(2)
	.max(12)
	.regex(/^[a-z]{2,3}(?:-[a-z]{2})?$/i)
	.optional();

const vadModeSchema = z.enum(['server', 'semantic']).optional();
const latencySchema = z.enum(['fast', 'balanced', 'accurate']).optional();

export const transcribe = action({
	args: {
		audio: audioArrayBufferSchema,
		contentType: audioContentTypeSchema,
		promptContext: promptContextSchema,
		dictionary: dictionarySchema,
		language: languageSchema,
	},
	handler: async (ctx, { audio, contentType, promptContext, dictionary, language }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');
		if (audio.byteLength > maxAudioBytes) throw new Error('Audio is too large to transcribe');

		const audioBlob = new Blob([audio], { type: contentType ?? 'audio/webm' });
		const file = new File([audioBlob], recordingFilename(contentType), { type: audioBlob.type });

		const formData = new FormData();
		formData.append('file', file);
		formData.append('model', fallbackModel);
		formData.append('response_format', 'json');
		formData.append('prompt', buildPrompt({ promptContext, dictionary }));
		if (language) formData.append('language', language);

		const response = await fetch(`${baseUrl}/audio/transcriptions`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
				'OpenAI-Safety-Identifier': await getSafetyIdentifier(identity.subject),
			},
			body: formData,
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('OpenAI transcription failed:', { status: response.status, error: errorText });
			throw new Error(`Transcription failed: ${response.status}`);
		}

		const json = await response.json();
		const result = z.object({ text: z.string() }).parse(json);
		const transcription = result.text.trim();

		console.debug('OpenAI transcription result', {
			model: fallbackModel,
			characterCount: transcription.length,
			dictionaryCount: buildDictionary({ promptContext, dictionary }).length,
		});

		return transcription;
	},
});

export const createRealtimeTranscriptionCall = action({
	args: {
		sdp: sdpSchema,
		promptContext: promptContextSchema,
		dictionary: dictionarySchema,
		language: languageSchema,
		vadMode: vadModeSchema,
		latency: latencySchema,
	},
	handler: async (ctx, { sdp, promptContext, dictionary, language, vadMode, latency }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');

		const session = {
			type: 'transcription',
			audio: {
				input: {
					transcription: {
						model: realtimeModel,
						prompt: buildPrompt({ promptContext, dictionary }),
						...(language ? { language } : {}),
					},
					turn_detection: buildTurnDetection(vadMode, latency),
				},
			},
			include: ['item.input_audio_transcription.logprobs'],
		};

		const formData = new FormData();
		formData.set('sdp', new Blob([sdp], { type: 'application/sdp' }), 'offer.sdp');
		formData.set('session', new Blob([JSON.stringify(session)], { type: 'application/json' }), 'session.json');

		const response = await fetch(`${baseUrl}/realtime/calls`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
				'OpenAI-Safety-Identifier': await getSafetyIdentifier(identity.subject),
			},
			body: formData,
		});

		const answerSdp = await response.text();

		if (!response.ok) {
			console.error('OpenAI realtime transcription call failed:', { status: response.status, error: answerSdp });
			throw new Error(`Realtime transcription call failed: ${response.status}`);
		}

		console.debug('OpenAI realtime transcription call created', {
			model: realtimeModel,
			dictionaryCount: buildDictionary({ promptContext, dictionary }).length,
			callLocation: response.headers.get('Location'),
		});

		return answerSdp;
	},
});

function buildPrompt({ promptContext, dictionary }: { promptContext?: string; dictionary?: string[] }) {
	const terms = buildDictionary({ promptContext, dictionary });
	const prompt = [`Keywords: ${terms.join(', ')}`];
	const context = promptContext?.trim();

	if (context) {
		prompt.push(`Current composer context: ${context.slice(-1200)}`);
	}

	return prompt.join('\n').slice(0, maxPromptCharacters);
}

function buildDictionary({ promptContext, dictionary }: { promptContext?: string; dictionary?: string[] }) {
	return dedupe([...baseDictionary, ...(dictionary ?? []), ...extractPromptDictionary(promptContext)]).slice(0, 100);
}

function buildTurnDetection(vadMode?: 'server' | 'semantic', latency: 'fast' | 'balanced' | 'accurate' = 'fast') {
	if (vadMode === 'semantic') {
		return {
			type: 'semantic_vad',
			eagerness: latency === 'accurate' ? 'low' : latency === 'balanced' ? 'medium' : 'high',
		};
	}

	return {
		type: 'server_vad',
		threshold: 0.5,
		prefix_padding_ms: 300,
		silence_duration_ms: latency === 'accurate' ? 1200 : latency === 'balanced' ? 700 : 350,
	};
}

function recordingFilename(contentType?: string) {
	const type = contentType?.split(';')[0]?.toLowerCase();

	if (type === 'audio/wav' || type === 'audio/x-wav') return 'recording.wav';
	if (type === 'audio/mpeg' || type === 'audio/mp3') return 'recording.mp3';
	if (type === 'audio/mp4') return 'recording.mp4';
	if (type === 'audio/m4a' || type === 'audio/x-m4a') return 'recording.m4a';

	return 'recording.webm';
}

async function getSafetyIdentifier(subject: string) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subject));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function extractPromptDictionary(promptContext?: string) {
	const context = promptContext?.trim();
	if (!context) return [];

	return Array.from(context.matchAll(/\b[A-Z][A-Za-z0-9]*(?:[.-][A-Za-z0-9]+)*\b|[A-Z]{2,}\b/g), (match) => match[0])
		.filter((term) => term.length > 1)
		.slice(0, 40);
}

function dedupe(values: string[]) {
	return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
