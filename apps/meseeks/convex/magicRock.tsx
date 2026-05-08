import { z } from 'zod/v3';
import { action } from 'lib/convex';
import { env } from 'schemas/envSchema';

const openAIBaseUrl = 'https://api.openai.com/v1';
const realtimeModel = 'gpt-realtime-whisper';
const fileModel = 'gpt-4o-transcribe';
const maxTranscriptionBytes = 25 * 1024 * 1024;
const maxSdpCharacters = 256 * 1024;

const defaultDictionary = ['Meseeks', 'DeepSeek', 'Qwen'];

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

const dictionarySchema = z.array(z.string().trim().min(1).max(80)).max(40).optional();

const languageSchema = z
	.string()
	.trim()
	.regex(/^[a-z]{2}(?:-[A-Z]{2})?$/)
	.optional();

const noiseReductionSchema = z.enum(['near_field', 'far_field']).optional();

const vadSchema = z
	.object({
		threshold: z.number().min(0).max(1).optional(),
		prefixPaddingMs: z.number().int().min(0).max(1000).optional(),
		silenceDurationMs: z.number().int().min(200).max(3000).optional(),
	})
	.optional();

export const createRealtimeTranscriptionCall = action({
	args: {
		sdp: z.string().min(1).max(maxSdpCharacters),
		dictionary: dictionarySchema,
		language: languageSchema,
		noiseReduction: noiseReductionSchema,
		includeLogprobs: z.boolean().optional(),
		vad: vadSchema,
	},
	handler: async (ctx, args) => {
		//
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');

		const prompt = buildPrompt(args.dictionary);
		const formData = new FormData();
		formData.set('sdp', args.sdp);
		formData.set(
			'session',
			JSON.stringify(
				buildRealtimeTranscriptionSession({
					prompt,
					language: args.language,
					noiseReduction: args.noiseReduction,
					includeLogprobs: args.includeLogprobs,
					vad: args.vad,
				}),
			),
		);

		const response = await fetch(`${openAIBaseUrl}/realtime/calls`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
				'OpenAI-Safety-Identifier': await safetyIdentifier(identity.subject),
			},
			body: formData,
		});

		const sdp = await response.text();

		if (!response.ok) {
			console.error('OpenAI realtime transcription setup failed:', {
				status: response.status,
				error: sdp,
			});
			throw new Error(`Realtime transcription setup failed: ${response.status}`);
		}

		if (!sdp.trim()) {
			throw new Error('Realtime transcription setup returned an empty SDP answer');
		}

		console.debug('Realtime transcription session created', {
			model: realtimeModel,
			characterCount: sdp.length,
			dictionary: prompt,
		});

		return {
			sdp,
			model: realtimeModel,
		};
	},
});

export const transcribe = action({
	args: {
		audio: audioArrayBufferSchema,
		contentType: audioContentTypeSchema,
		dictionary: dictionarySchema,
		language: languageSchema,
	},
	handler: async (ctx, { audio, contentType, dictionary, language }) => {
		//
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error('Unauthorized');

		if (audio.byteLength > maxTranscriptionBytes) {
			throw new Error('Audio is too large to transcribe');
		}

		const normalizedContentType = normalizeAudioContentType(contentType);
		if (contentType && !normalizedContentType) {
			throw new Error('Unsupported audio format');
		}

		const audioBlob = new Blob([audio], { type: normalizedContentType ?? 'audio/webm' });
		const file = new File([audioBlob], `recording.${audioExtension(audioBlob.type)}`, {
			type: audioBlob.type,
		});
		const prompt = buildPrompt(dictionary);

		const formData = new FormData();
		formData.append('file', file);
		formData.append('model', fileModel);
		formData.append('prompt', prompt);
		formData.append('response_format', 'json');

		if (language) {
			formData.append('language', language);
		}

		const response = await fetch(`${openAIBaseUrl}/audio/transcriptions`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
				'OpenAI-Safety-Identifier': await safetyIdentifier(identity.subject),
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

		console.debug('Transcription result', {
			model: fileModel,
			baseUrl: openAIBaseUrl,
			characterCount: transcription.length,
			dictionary: prompt,
			text: transcription,
		});

		return transcription;
	},
});

function buildRealtimeTranscriptionSession({
	prompt,
	language,
	noiseReduction,
	includeLogprobs,
	vad,
}: {
	prompt: string;
	language?: string;
	noiseReduction?: 'near_field' | 'far_field';
	includeLogprobs?: boolean;
	vad?: {
		threshold?: number;
		prefixPaddingMs?: number;
		silenceDurationMs?: number;
	};
}) {
	//
	return {
		type: 'transcription',
		audio: {
			input: {
				noise_reduction: {
					type: noiseReduction ?? 'near_field',
				},
				transcription: {
					model: realtimeModel,
					prompt,
					...(language && { language }),
				},
				turn_detection: {
					type: 'server_vad',
					threshold: vad?.threshold ?? 0.5,
					prefix_padding_ms: vad?.prefixPaddingMs ?? 300,
					silence_duration_ms: vad?.silenceDurationMs ?? 500,
				},
			},
		},
		...(includeLogprobs && { include: ['item.input_audio_transcription.logprobs'] }),
	};
}

function buildPrompt(dictionary: string[] | undefined) {
	//
	const terms = Array.from(new Set(defaultDictionary.concat(dictionary ?? []).map((term) => term.trim()))).filter(
		Boolean,
	);

	return `Keywords: ${terms.join(', ')}`;
}

function normalizeAudioContentType(contentType: string | undefined) {
	//
	if (!contentType) return undefined;

	const normalized = contentType.split(';')[0]?.trim().toLowerCase();
	if (!normalized) return undefined;

	if (supportedAudioTypes.has(normalized)) return normalized;
	return undefined;
}

function audioExtension(contentType: string) {
	//
	const normalized = normalizeAudioContentType(contentType);

	switch (normalized) {
		case 'audio/flac':
			return 'flac';
		case 'audio/mp4':
		case 'audio/m4a':
			return 'm4a';
		case 'audio/mpeg':
		case 'audio/mp3':
		case 'audio/mpga':
			return 'mp3';
		case 'audio/ogg':
			return 'ogg';
		case 'audio/wav':
		case 'audio/x-wav':
			return 'wav';
		case 'audio/webm':
		default:
			return 'webm';
	}
}

const supportedAudioTypes = new Set([
	'audio/flac',
	'audio/m4a',
	'audio/mp3',
	'audio/mp4',
	'audio/mpeg',
	'audio/mpga',
	'audio/ogg',
	'audio/wav',
	'audio/webm',
	'audio/x-wav',
]);

async function safetyIdentifier(subject: string) {
	//
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subject));
	const hash = Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');

	return `user_${hash}`;
}
