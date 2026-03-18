import { tool } from 'ai';
import { dset } from 'dset';
import type { z } from 'zod/v3';
import { internal } from 'convex/_generated/api';
import type { Doc } from 'convex/_generated/dataModel';
import type { ActionCtx, MutationCtx } from 'convex/_generated/server';
import type { hardSkillSchema } from 'schemas/skillSchema';
import { stringToZod } from 'lib/zodToString';
import { env } from 'schemas/envSchema';
import type { AITool } from 'schemas/toolSchema';
import { createReactions } from './createReactions';

export function createHTTPTool(
	ctx: ActionCtx | MutationCtx,
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	skill: z.infer<typeof hardSkillSchema>,
): AITool {
	//
	return tool({
		description: skill.description,
		inputSchema: stringToZod(skill.inputSchema),
		execute: async (args) => {
			//
			console.debug('Running skill', skill.key, args);

			const config = skill.config;
			const url = new URL(config.url);
			const headers = { ...config.headers };

			// apply parameter mappings and compute the request body
			const bodyData = config.paramMappings.reduce((body, { source, target, type }) => {
				//
				const value = args[source as keyof typeof args];

				if (value) {
					switch (type) {
						case 'search':
							url.searchParams.set(target, String(value));
							break;
						case 'header':
							headers[target] = String(value);
							break;
						case 'path':
							url.pathname = url.pathname.replace(`:${target}`, String(value));
							break;
						case 'body':
							body[target] = value;
							break;
						case 'bodyPath':
							dset(body, target, value);
							break;
					}
				}

				return body;
				//
			}, config.body?.template ?? {});

			const requestBody = Object.keys(bodyData).length > 0 ? JSON.stringify(bodyData) : undefined;
			const requestBodySize = requestBody ? new Blob([requestBody]).size : undefined;

			console.debug('requesting', config.method, url.toString());

			// make the request
			const response = await fetch(url.toString(), {
				method: config.method,
				headers,
				body: requestBody,
			});

			console.debug('Response', response.status, response.statusText);

			// treat everything as text and let the LLM do its magic
			const text = await response.text();
			console.debug('Result', text);

			await _persistDetails({
				ctx,
				action,
				skill,
				config,
				url,
				requestBodySize,
				response,
				responseText: text,
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}. Body: ${text}`);
			}

			return {
				result: {
					...(text ? { text } : {}),
					reactions: createReactions(action, skill.knownReactions),
				},
				costs: [
					{
						symbol: 'USD',
						amount: skill.cost,
						description:
							skill.key === 'analyze' ? 'Free thanks to Daytona.io!' : 'Skill cost (to provider)',
					},
					{
						symbol: 'USD',
						amount: env.ACTION_COST_USD,
						description: 'Meseeks action (included on your plan)',
					},
				],
			};
		},
	});
}

async function _persistDetails({
	ctx,
	action,
	skill,
	config,
	url,
	requestBodySize,
	response,
	responseText,
}: {
	ctx: ActionCtx | MutationCtx;
	action: Doc<'actions'>;
	skill: z.infer<typeof hardSkillSchema>;
	config: z.infer<typeof hardSkillSchema>['config'];
	url: URL;
	requestBodySize?: number;
	response: Response;
	responseText?: string;
}) {
	//
	// capture response details for debugging
	const responseBodySize = responseText ? new Blob([responseText]).size : undefined;

	// Store full response body but truncate based on env setting for safety within Convex's 1MB document limit
	let responseBody: string | undefined;

	if (responseText) {
		if (responseText.length <= env.MAX_HTTP_RESPONSE_BODY_BYTES) {
			responseBody = responseText;
		} else {
			// Truncate and add a note about truncation
			const truncated = responseText.substring(0, env.MAX_HTTP_RESPONSE_BODY_BYTES);
			responseBody = `${truncated}\n\n[Response truncated at ${Math.round(env.MAX_HTTP_RESPONSE_BODY_BYTES / 1024)}KiB for Convex document size limit]`;
		}
	}

	// response headers are generally safe to persist (no API keys usually)
	const responseHeaders: Record<string, string> = {};
	response.headers.forEach((value, key) => {
		responseHeaders[key] = value;
	});

	console.debug('Attempting to persist HTTP action details for action:', action._id);

	// Update existing action details with response data
	await ctx.runMutation(internal.action.details._update, {
		actionId: action._id,
		updates: {
			http: {
				requestBodySize,
				statusCode: response.status,
				statusText: response.statusText,
				responseBodySize,
				responseBody,
				responseHeaders,
			},
		},
	});
}
