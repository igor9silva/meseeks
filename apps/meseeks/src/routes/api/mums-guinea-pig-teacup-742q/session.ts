import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod/v3';

const translationClientSecretUrl = 'https://api.openai.com/v1/realtime/translations/client_secrets';
const model = 'gpt-realtime-translate';
const transcriptionModel = 'gpt-realtime-whisper';

const targetLanguageSchema = z.enum(['en', 'pt', 'zh']);
const requestSchema = z.object({
	targetLanguage: targetLanguageSchema,
});

export const Route = createFileRoute('/api/mums-guinea-pig-teacup-742q/session')({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const apiKey = process.env.OPENAI_API_KEY;

				if (!apiKey) {
					return Response.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 });
				}

				const parsedBody = requestSchema.safeParse(await request.json().catch(() => null));

				if (!parsedBody.success) {
					return Response.json({ error: 'Choose a supported target language.' }, { status: 400 });
				}

				const response = await fetch(translationClientSecretUrl, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${apiKey}`,
						'Content-Type': 'application/json',
						'OpenAI-Safety-Identifier': 'meseeks-mum-translator-mvp',
					},
					body: JSON.stringify({
						session: {
							model,
							audio: {
								input: {
									transcription: {
										model: transcriptionModel,
									},
									noise_reduction: {
										type: 'near_field',
									},
								},
								output: {
									language: parsedBody.data.targetLanguage,
								},
							},
						},
					}),
				});

				const responseText = await response.text();
				const body = parseOpenAIResponse(responseText);

				if (!response.ok) {
					console.error('OpenAI translation client secret failed:', {
						status: response.status,
						body,
					});

					return Response.json(
						{ error: `OpenAI translation session failed with ${response.status}.` },
						{ status: response.status },
					);
				}

				return Response.json(body, {
					status: 200,
					headers: {
						'Cache-Control': 'no-store',
					},
				});
			},
		},
	},
} as any);

function parseOpenAIResponse(responseText: string) {
	try {
		return JSON.parse(responseText);
	} catch {
		return { error: responseText };
	}
}
