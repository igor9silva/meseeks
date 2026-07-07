import { z } from 'zod/v3';
import type { Id } from 'convex/_generated/dataModel';
import type { StagedText } from 'schemas/reactorSchema';

export const requestPreparationSchema = z.object({
	url: z.string().url(),
	method: z
		.enum([
			'GET', //
			'POST',
			'PUT',
			'PATCH',
			'DELETE',
		])
		.default('GET'),
	headers: z.record(z.string()).optional(),
	body: z.unknown().optional(),
	timeoutMs: z.number().int().positive().optional(),
	warnings: z.array(z.string()).optional(),
});

export type RequestPreparation = z.infer<typeof requestPreparationSchema>;

export function prepareRequest(args: z.input<typeof requestPreparationSchema>) {
	//
	return requestPreparationSchema.parse(args);
}

export async function performRequest({
	action,
	preparation,
	stageText,
	warnings,
}: {
	action: { _id: Id<'actions'>; owner: Id<'users'> };
	preparation: RequestPreparation;
	stageText(args: { owner: Id<'users'>; content: string; contentType: string }): Promise<StagedText>;
	warnings: Array<string>;
}) {
	//
	const request = requestPreparationSchema.parse(preparation);
	const response = await fetch(request.url, {
		method: request.method,
		headers: request.headers,
		body: formatBody(request.body),
	});
	const text = await response.text();
	const headers: Record<string, string> = {};

	for (const [key, value] of response.headers) {
		headers[key] = value;
	}

	const content = [
		`# ${request.method} ${request.url}`,
		'',
		`Status: ${response.status}`,
		'',
		'```',
		text,
		'```',
	].join('\n');
	const output = await stageText({
		owner: action.owner,
		content,
		contentType: 'text/mdx; charset=utf-8',
	});

	return {
		action: action._id,
		status: response.ok ? ('succeeded' as const) : ('failed' as const),
		output,
		providerReceipt: {
			provider: 'http',
			request: {
				url: request.url,
				method: request.method,
				headers: request.headers,
			},
			response: {
				status: response.status,
				headers,
			},
		},
		warnings,
	};
}

function formatBody(body: unknown) {
	//
	if (body === undefined) return undefined;
	if (typeof body === 'string') return body;

	return JSON.stringify(body);
}
