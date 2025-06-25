import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { modelsSchema, skillKindSchema } from './skillSchema';

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
				method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).describe('HTTP method used'),
				url: z.string().url().describe('Full URL that was called (including query params)'),
				requestBodySize: z.number().min(0).optional().describe('Size of request body in bytes'),

				// response details
				statusCode: z.number().min(100).max(599).describe('HTTP response status code'),
				statusText: z.string().describe('HTTP response status message'),
				responseBodySize: z.number().min(0).optional().describe('Size of response body in bytes'),
				responseBody: z
					.string()
					.optional()
					.describe(
						'Full HTTP response body (truncated based on MAX_HTTP_RESPONSE_BODY_BYTES env setting for safety within Convex 1MB document limit)',
					),
				responseHeaders: z.record(z.string()).describe('HTTP response headers (generally safe to store)'),
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
				model: modelsSchema.describe('Specific model that was used for this execution'),
				provider: z.string().describe('AI provider (extracted from model)'),
				temperature: temperatureSchema.describe('Temperature setting used for this call'),
				maxTokens: z.number().min(1).optional().describe('Maximum tokens limit set for generation'),

				// context information
				systemInstructions: z.string().describe('System prompt that was provided to the model'),
				historyLength: z.number().min(0).describe('Number of conversation messages in context'),
				availableTools: z.array(z.string()).describe('List of tool keys that were made available to the model'),

				// execution results
				finishReason: z.string().describe('Why the model stopped generating (stop, length, tool-calls, etc.)'),
				text: z.string().optional().describe('Direct text response from the model'),
				toolCalls: z
					.array(
						z
							.object({
								toolName: z.string().describe('Name of the tool the model chose to call'),
								args: z.record(z.unknown()).describe('Arguments passed to the tool'),
							})
							.describe('Individual tool call made by the model'),
					)
					.optional()
					.describe('List of tool calls made by the model'),

				// comprehensive usage statistics
				usage: tokenUsageSchema.describe('Detailed token usage breakdown for cost analysis'),

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

// Export individual schemas for type inference
export type HttpActionDetail = z.infer<typeof httpActionDetailSchema>;
export type LlmActionDetail = z.infer<typeof llmActionDetailSchema>;
export type ActionDetail = z.infer<typeof actionDetailSchema>;
