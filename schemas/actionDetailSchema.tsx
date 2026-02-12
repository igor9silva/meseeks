import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { skillKindSchema } from './skillSchema';

const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
const httpStatusCodeSchema = z.number().min(100).max(599);
const bodySizeSchema = z.number().min(0);

const toolCallSchema = z.object({
	toolName: z.string(),
	input: z.record(z.unknown()),
});

const temperatureSchema = z.number().min(0).max(2).describe('Temperature setting for model randomness (0-2)');

const tokenUsageSchema = z
	.object({
		input: z
			.object({
				total: z.number().min(0).describe('Total input tokens used'),
				cached: z.number().min(0).optional().describe('Number of cached input tokens'),
			})
			.describe('Input token usage breakdown'),
		output: z
			.object({
				total: z.number().min(0).describe('Total output tokens generated'),
				cached: z.number().min(0).optional().describe('Number of cached output tokens'),
			})
			.describe('Output token usage breakdown'),
	})
	.describe('Comprehensive token usage statistics');

const baseActionDetailSchema = z
	.object({
		actionId: zid('actions').describe('Reference to the action this detail belongs to'),
		skillKind: skillKindSchema.exclude(['built-in']).describe('Type of skill that was executed'),
		skillKey: z.string().describe('Unique identifier of the skill'),
		skillDescription: z.string().describe('Human-readable description of what the skill does'),
	})
	.describe('Base information for any action execution');

// For hard actions (HTTP calls)
const httpActionDetailSchema = baseActionDetailSchema
	.extend({
		skillKind: z.literal('hard'),
		http: z
			.object({
				// request details (sanitized for security)
				method: httpMethodSchema.optional().describe('HTTP method used'),
				url: z.string().url().optional().describe('Full URL that was called (including query params)'),
				requestBodySize: bodySizeSchema.optional().describe('Size of request body in bytes'),

				// note: request headers and body are not stored as they may contain sensitive information

				// response details
				statusCode: httpStatusCodeSchema.optional().describe('HTTP response status code'),
				statusText: z.string().optional().describe('HTTP response status message'),
				responseBodySize: bodySizeSchema.optional().describe('Size of response body in bytes'),
				responseBody: z
					.string()
					.optional()
					.describe(
						'Full HTTP response body (truncated based on MAX_HTTP_RESPONSE_BODY_BYTES env setting for safety within Convex 1MB document limit)',
					),
				responseHeaders: z
					.record(z.string())
					.optional()
					.describe('HTTP response headers (generally safe to store)'),
			})
			.describe('HTTP request/response details with security-conscious data filtering'),
	})
	.describe('Debugging information for HTTP-based skill executions');

// For soft actions (LLM calls)
const llmActionDetailSchema = baseActionDetailSchema
	.extend({
		skillKind: z.literal('soft'),
		llm: z
			.object({
				// model configuration
				model: z.string().describe('Specific model that was used for this execution'),
				provider: z.string().describe('AI provider (extracted from model)'),
				temperature: temperatureSchema.describe('Temperature setting used for this call'),
				maxTokens: z.number().min(1).optional().describe('Maximum tokens limit set for generation'),

				// context information
				systemInstructions: z.string().describe('System prompt that was provided to the model'),
				historyLength: z.number().min(0).describe('Number of conversation messages in context'),
				history: z
					.array(
						z
							.object({
								role: z
									.enum([
										'system', //
										'user',
										'assistant',
										'tool',
										'data',
										'function',
									])
									.describe('Role of the message sender'),
								content: z.string().describe('Content of the message'),
							})
							.describe('Individual message in the conversation history'),
					)
					.describe('Complete conversation history that was sent to the model'),
				availableTools: z.array(z.string()).describe('List of tool keys that were made available to the model'),

				// execution results
				finishReason: z
					.string()
					.optional()
					.describe('Why the model stopped generating (stop, length, tool-calls, etc.)'),

				text: z.string().optional().describe('Direct text response from the model'),

				toolCalls: z.array(toolCallSchema).optional().describe('List of tool calls made by the model'),

				// comprehensive usage statistics
				usage: tokenUsageSchema.optional().describe('Detailed token usage breakdown for cost analysis'),

				// warnings and metadata (preserved as-is for debugging)
				warnings: z.array(z.unknown()).optional().describe('AI SDK warnings (can be complex objects)'),

				providerMetadata: z.record(z.unknown()).optional().describe('Provider-specific metadata for debugging'),
			})
			.describe('Comprehensive LLM execution details including model config, context, and results'),
	})
	.describe('Debugging information for LLM-based skill executions');

export const actionDetailSchema = z
	.union([httpActionDetailSchema, llmActionDetailSchema])
	.describe('Complete action execution details for debugging and transparency');

const llmUpdateFields = z.object({
	finishReason: z.string().optional(),
	text: z.string().optional(),
	toolCalls: z.array(toolCallSchema).optional(),
	usage: tokenUsageSchema.optional(),
	warnings: z.array(z.unknown()).optional(),
	providerMetadata: z.record(z.unknown()).optional(),
});

const httpUpdateFields = z.object({
	requestBodySize: bodySizeSchema.optional(),
	statusCode: httpStatusCodeSchema.optional(),
	statusText: z.string().optional(),
	responseBodySize: bodySizeSchema.optional(),
	responseBody: z.string().optional(),
	responseHeaders: z.record(z.string()).optional(),
});

// Update schema - only mutable fields can be updated
export const actionDetailUpdateSchema = z.union([
	z.object({
		llm: llmUpdateFields,
	}),
	z.object({
		http: httpUpdateFields,
	}),
]);
