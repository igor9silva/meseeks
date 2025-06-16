import { tool } from 'ai';
import { z } from 'zod';
import { Doc } from '../_generated/dataModel';
import { ActionCtx, MutationCtx } from '../_generated/server';
import { stringToZod } from '../lib/zodToString';
import { env } from '../schemas/envSchema';
import { hardSkillSchema } from '../schemas/skillSchema';
import { AITool } from '../schemas/toolSchema';
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
		parameters: stringToZod(skill.inputSchema),
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
					}
				}

				return body;
				//
			}, config.body?.template ?? {});

			console.debug('requesting', config.method, url.toString());

			// make the request
			const response = await fetch(url.toString(), {
				method: config.method,
				headers,
				body: Object.keys(bodyData).length > 0 ? JSON.stringify(bodyData) : undefined,
			});

			console.debug('Response', response.status, response.statusText);

			// treat everything as text and let the LLM do its magic
			const text = await response.text();
			console.debug('Result', text);

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
						description: 'Skill cost (to provider)',
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
