import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod/v3';

const openAIRealtimeCallsUrl = 'https://api.openai.com/v1/realtime/calls';
const model = 'gpt-realtime-translate';
const transcriptionModel = 'gpt-4o-transcribe';

const targetSchema = z.enum(['english', 'mandarin', 'portuguese']).default('english');

const targetLanguages = {
	english: 'British English',
	mandarin: 'Mandarin Chinese',
	portuguese: 'Portuguese',
} as const;

export const Route = createFileRoute('/api/mums-guinea-pig-teacup-742q/session')({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const apiKey = process.env.OPENAI_API_KEY;

				if (!apiKey) {
					return Response.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 });
				}

				const target = targetSchema.parse(new URL(request.url).searchParams.get('target') ?? undefined);
				const sdp = await request.text();

				if (!sdp.trim()) {
					return Response.json({ error: 'Missing SDP offer.' }, { status: 400 });
				}

				const formData = new FormData();
				formData.set('sdp', sdp);
				formData.set('session', JSON.stringify(createSessionConfig(target)));

				const response = await fetch(openAIRealtimeCallsUrl, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiKey}`,
						'OpenAI-Safety-Identifier': 'meseeks-mum-translator-mvp',
					},
					body: formData,
				});

				const answer = await response.text();

				if (!response.ok) {
					console.error('OpenAI realtime session failed:', {
						status: response.status,
						body: answer,
					});

					return Response.json(
						{ error: `OpenAI realtime session failed with ${response.status}.` },
						{ status: response.status },
					);
				}

				return new Response(answer, {
					status: 200,
					headers: {
						'Content-Type': 'application/sdp',
						'Cache-Control': 'no-store',
					},
				});
			},
		},
	},
} as any);

function createSessionConfig(target: z.output<typeof targetSchema>) {
	const language = targetLanguages[target];

	return {
		type: 'realtime',
		model,
		output_modalities: ['audio'],
		instructions: createInstructions(language),
		audio: {
			input: {
				transcription: {
					model: transcriptionModel,
				},
				turn_detection: {
					type: 'semantic_vad',
					eagerness: 'medium',
					create_response: true,
					interrupt_response: true,
				},
			},
			output: {
				voice: 'marin',
				speed: 0.95,
			},
		},
	};
}

function createInstructions(language: string) {
	return [
		`Translate every spoken turn into ${language}.`,
		'Only translate what was said. Do not answer as an assistant.',
		'Keep names, places, laughter, and small affectionate phrases natural.',
		'If the speaker pauses or corrects themselves, preserve the corrected meaning.',
		'Use warm, clear phrasing suitable for a family conversation.',
	].join(' ');
}
