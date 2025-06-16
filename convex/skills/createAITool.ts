import { tool, type CoreMessage, type ToolSet } from 'ai';
import type { z } from 'zod';
import type { Doc, Id } from '../_generated/dataModel';
import type { ActionCtx, MutationCtx } from '../_generated/server';
import { asDollars } from '../lib/money';
import { stringToZod } from '../lib/zodToString';
import { _askMagicRock, type MagicRockContext } from '../magicRock';
import type { newActionSchema } from '../schemas/actionSchema';
import { env } from '../schemas/envSchema';
import { pricingFor, type modelsSchema, type skillSchema, type softSkillSchema } from '../schemas/skillSchema';
import type { AITool } from '../schemas/toolSchema';

export function createAITool(
	ctx: ActionCtx | MutationCtx,
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	skill: z.infer<typeof softSkillSchema>,
	context?: MagicRockContext,
): AITool {
	//
	if (!context) {
		return {
			description: skill.description,
			parameters: stringToZod(skill.inputSchema),
		};
	}

	return tool({
		description: skill.description,
		parameters: stringToZod(skill.inputSchema),
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
			} = await _askMagicRock(context);

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

			switch (finishReason) {
				//
				case 'tool-calls':
					//
					if (toolCalls.length > 1) {
						console.warn('Multiple tool calls', toolCalls);
					}

					if (toolCalls.length === 0) {
						console.warn('No tool calls but finish reason is `tool-calls`');
					}

					// TODO: disabled multiple tool calls for now - we need to improve lifecyle first
					// ...toolCalls.map((call) => ({
					// 	skillKey: call.toolName,
					// 	args: call.args,
					// 	taskId: task._id,
					// 	author: action._id,
					// 	owner: task.owner,
					// 	depth: action.depth + 1,
					// })),

					reactions.push({
						skillKey: toolCalls[0].toolName,
						args: toolCalls[0].args,
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
				case 'length': say(`Max length hit: ${warnings}`); break;

				// prettier-ignore
				default: throw new Error(`Unknown finish reason: ${finishReason}`);
			}

			if (warnings?.length) console.warn('Decision skill warnings', warnings);

			return {
				result: {
					reactions,
				},
				costs: [
					{
						symbol: 'USD',
						amount: calculateProviderCost({
							model: modelFrom(skill.config.model, task.preferredIntelligence),
							inputTokens: { uncached: usage.promptTokens },
							outputTokens: { uncached: usage.completionTokens },
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

	const instructionsLength = context.system?.length ?? 0;
	const toolsLength = computeToolsLength(context.tools);
	const historyLength = computeHistoryLength(context.messages as Array<CoreMessage>);

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
	model: z.infer<typeof modelsSchema>;
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
	const pricing = pricingFor(model);

	console.debug('Input tokens', inputTokens);
	console.debug('Output tokens', outputTokens);

	const inputCost = BigInt(inputTokens.uncached) * pricing.inputToken;
	const outputCost = BigInt(outputTokens.uncached) * pricing.outputToken;
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
		length += typeof tool.parameters === 'string' ? tool.parameters.length : 0;
	}

	return length;
}

function computeHistoryLength(messages: Array<CoreMessage>) {
	return messages.reduce((acc, message) => acc + message.content.length, 0);
}

export function modelFrom(
	skillModel: z.infer<typeof modelsSchema> | 'auto', //
	taskPreferredIntelligence?: z.infer<typeof modelsSchema>,
): z.infer<typeof modelsSchema> {
	//
	if (skillModel === 'auto') return taskPreferredIntelligence ?? 'anthropic/claude-3.5-haiku';

	return skillModel;
}
