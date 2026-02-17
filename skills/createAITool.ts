import { tool, type ModelMessage, type SystemModelMessage, type ToolSet } from 'ai';
import type { z } from 'zod';
import { internal } from 'convex/_generated/api';
import type { Doc, Id } from 'convex/_generated/dataModel';
import type { ActionCtx, MutationCtx } from 'convex/_generated/server';
import { asDollars } from 'lib/money';
import { stringToZod } from 'lib/zodToString';
import { askMagicRock, type MagicRockContext } from 'convex/magicRock.private';
import type { newActionSchema } from 'schemas/actionSchema';
import { env } from 'schemas/envSchema';
import { DEFAULT_INTELLIGENCE, INTELLIGENCES, intelligenceKeys } from 'schemas/intelligenceSchema';
import { type skillSchema, type softSkillSchema } from 'schemas/skillSchema';
import type { AITool, AIToolResult } from 'schemas/toolSchema';

export function createAITool(
	ctx: ActionCtx | MutationCtx,
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	skill: z.infer<typeof softSkillSchema>,
	context?: MagicRockContext,
): AITool {
	//
	if (!context) {
		// tool definition for LLM discovery only
		// `execute` is required since AI SDK v6
		// _toolsForMagicRock sets execute = undefined on all tools, so this never runs
		return tool({
			description: skill.description,
			inputSchema: stringToZod(skill.inputSchema),
			execute: async (): Promise<AIToolResult> => {
				throw new Error(`Tool ${skill.key} executed without context`);
			},
		});
	}

	return tool({
		description: skill.description,
		inputSchema: stringToZod(skill.inputSchema),
		execute: async (args) => {
			//
			console.debug('Running decision skill', skill.key, args);

			const {
				text, //
				toolCalls,
				finishReason,
				usage,
				warnings,
				providerMetadata,
				//
			} = await askMagicRock(context);

			console.debug('Provider metadata', providerMetadata);

			const reactions = [] as Array<z.infer<typeof newActionSchema>>;

			// prettier-ignore
			const say = (text: string) => reactions.push({
				skillKey: 'say',
				args: { message: text },
				taskId: task._id,
				author: action._id,
				owner: task.owner,
				depth: action.depth + 1,
			});

			// get intelligence key for logging
			const intelligenceKey = modelFrom(skill.config.model, task.preferredIntelligence);

			let reason = finishReason;
			if (toolCalls.length > 0 && reason === 'stop') {
				reason = 'tool-calls';
				console.info(
					`(${intelligenceKey}) Has tool calls but finish reason is 'stop': ${toolCalls.map((call) => call.toolName).join(', ')}`,
				);
			}

			switch (reason) {
				//
				case 'tool-calls':
					//
					if (toolCalls.length > 1) {
						console.warn(`(${intelligenceKey}) Multiple tool calls`, toolCalls);
					}

					if (toolCalls.length === 0) {
						console.warn('No tool calls but finish reason is `tool-calls`');
					}

					// TODO: disabled multiple tool calls for now - we need to improve lifecyle first
					// ...toolCalls.map((call) => ({
					// 	skillKey: call.toolName,
					// 	args: call.input,
					// 	taskId: task._id,
					// 	author: action._id,
					// 	owner: task.owner,
					// 	depth: action.depth + 1,
					// })),

					reactions.push({
						skillKey: toolCalls[0].toolName,
						args: toolCalls[0].input,
						taskId: task._id,
						author: action._id,
						owner: task.owner,
						depth: action.depth + 1,
					});
					break;

				// prettier-ignore
				case 'stop': say(text); break;

				// prettier-ignore
				case 'error': say(text); break;

				// prettier-ignore
				case 'content-filter': say(`[damn @sama] Content filter hit: ${warnings}`); break;

				// TODO: better handling of max length
				// prettier-ignore
				case 'length': say(`Max length hit. ${warnings}`); break;

				// prettier-ignore
				default: throw new Error(`Unknown finish reason: ${reason}`);
			}

			if (warnings?.length) console.warn('Decision skill warnings', warnings);

			await _persistDetails({
				ctx,
				action,
				finishReason: reason,
				text,
				toolCalls,
				usage,
				warnings,
				providerMetadata,
			});

			// warn if token counts are missing (could affect billing)
			// they're optional since AI SDK v6
			if (usage.inputTokens === undefined || usage.outputTokens === undefined) {
				console.warn(
					`Missing token usage for ${skill.key}: input=${usage.inputTokens}, output=${usage.outputTokens}`,
				);
			}

			return {
				result: {
					reactions,
				},
				costs: [
					{
						symbol: 'USD',
						amount: calculateProviderCost({
							model: modelFrom(skill.config.model, task.preferredIntelligence),
							inputTokens: { uncached: usage.inputTokens ?? 0 },
							outputTokens: { uncached: usage.outputTokens ?? 0 },
						}),
						description: 'Provider cost',
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

export function estimateCostFor(
	skill: z.infer<typeof skillSchema>, //
	task: Doc<'tasks'>,
	actionId: Id<'actions'>,
	context?: MagicRockContext,
) {
	//
	if (skill.cost !== 'dynamic') return skill.cost;
	if (!context) throw new Error('Context is required for dynamic cost estimation');

	const instructionsLength = extractSystemInstructions(context.system).length;
	const toolsLength = computeToolsLength(context.tools);
	const historyLength = computeHistoryLength(context.messages as Array<ModelMessage>);

	const inputLength = instructionsLength + toolsLength + historyLength;

	const inputTokens = Math.ceil(inputLength / env.CHAR_PER_TOKEN);
	const outputTokens = Math.min(8000, Math.ceil(inputTokens / 4)); // 1/4 as input, capped at 8000, TODO: improve

	// assume worst-cast scenario with no cached tokens
	const providerCost = calculateProviderCost({
		model: modelFrom(skill.config.model, task.preferredIntelligence),
		inputTokens: { uncached: inputTokens },
		outputTokens: { uncached: outputTokens },
	});

	const actionCost = env.ACTION_COST_USD;
	const totalCost = providerCost + actionCost;

	// add a fixed margin to account for unpredictable costs and bad math
	const marginPercent = env.COST_PREDICTION_MARGIN / 100;
	const marginFactor = 100n + BigInt(Math.round(marginPercent * 100));
	const totalCostWithMargin = (totalCost * marginFactor) / 100n;

	console.debug(
		`Estimated cost for ${skill.key} (${actionId}): ${asDollars({ bigInt: totalCostWithMargin, precision: 6 })} USD`,
	);
	console.debug(`Input tokens: ${inputTokens}`);
	console.debug(`Output tokens: ${outputTokens}`);

	return totalCostWithMargin;
}

export function calculateProviderCost({
	model, //
	inputTokens,
	outputTokens,
}: {
	model: z.infer<typeof intelligenceKeys>;
	inputTokens: {
		uncached: number;
		cached?: number;
	};
	outputTokens: {
		uncached: number;
		cached?: number;
	};
}) {
	// TODO: account for cached tokens
	// inspect loggged providerMetadata to get the cached tokens path
	const pricing = INTELLIGENCES[model].pricing;

	console.debug('Input tokens', inputTokens);
	console.debug('Output tokens', outputTokens);

	const inputCost = BigInt(inputTokens.uncached) * pricing.inputPerToken;
	const outputCost = BigInt(outputTokens.uncached) * pricing.outputPerToken;
	const totalProviderCost = inputCost + outputCost;

	console.debug('Decision provider cost', asDollars({ bigInt: totalProviderCost, precision: 6 }));
	console.debug('Action cost', asDollars({ bigInt: env.ACTION_COST_USD, precision: 6 }));

	return totalProviderCost;
}

function computeToolsLength(toolSet?: ToolSet) {
	//
	if (!toolSet) return 0;

	let length = 0;

	// ToolSet is an object, so we need to iterate over its values
	for (const key in toolSet) {
		const tool = toolSet[key];
		length += tool.description?.length ?? 0;
		// estimate schema contribution by serializing it
		try {
			length += JSON.stringify(tool.inputSchema).length;
		} catch {
			length += 100; // fallback if serialization fails
		}
	}

	return length;
}

function computeHistoryLength(messages: Array<ModelMessage>) {
	return messages.reduce((acc, message) => acc + message.content.length, 0);
}

export function modelFrom(
	skillModel: z.infer<typeof intelligenceKeys> | 'auto', //
	taskPreferredIntelligence?: z.infer<typeof intelligenceKeys>,
): z.infer<typeof intelligenceKeys> {
	//
	if (skillModel === 'auto') return taskPreferredIntelligence ?? DEFAULT_INTELLIGENCE;

	return skillModel;
}

// Update existing action details with response data
async function _persistDetails({
	ctx,
	action,
	finishReason,
	text,
	toolCalls,
	usage,
	warnings,
	providerMetadata,
}: {
	ctx: ActionCtx | MutationCtx;
	action: Doc<'actions'>;
	finishReason?: string;
	text?: string;
	toolCalls: Array<{ toolName: string; input: Record<string, unknown> }>;
	usage: { inputTokens: number | undefined; outputTokens: number | undefined };
	warnings?: unknown[];
	providerMetadata?: Record<string, unknown>;
}) {
	//
	await ctx.runMutation(internal.action.details._update, {
		actionId: action._id,
		updates: {
			llm: {
				finishReason,
				text,
				toolCalls,
				usage: {
					input: {
						total: usage.inputTokens ?? 0,
						cached: 0, // TODO: extract from providerMetadata if available
					},
					output: {
						total: usage.outputTokens ?? 0,
						cached: 0, // TODO: extract from providerMetadata if available
					},
				},
				warnings,
				providerMetadata,
			},
		},
	});
}

// extract system instructions as string from any format (string, SystemModelMessage, or array)
export function extractSystemInstructions(
	system: string | SystemModelMessage | Array<SystemModelMessage> | undefined,
): string {
	//
	if (!system) return '';

	if (typeof system === 'string') return system;

	if (Array.isArray(system)) {
		return system.map((msg) => (typeof msg.content === 'string' ? msg.content : '')).join('\n');
	}

	// single SystemModelMessage
	return typeof system.content === 'string' ? system.content : '';
}
