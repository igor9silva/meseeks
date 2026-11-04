import type { Tool, ToolSet } from 'ai';
import type { z } from 'zod';
import type { newActionSchema } from './actionSchema';
import type { tokenSchema } from './topUpSchema';

// standardized tool result type for all Meseeks tools
export type AIToolResult = {
	result: {
		text?: string | undefined;
		reactions: Array<z.infer<typeof newActionSchema>>;
	};
	costs: Array<{
		symbol: z.infer<typeof tokenSchema>;
		amount: bigint;
		description: string;
	}>;
};

// AITool uses AI SDK's Tool type with our result type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AITool = Tool<any, AIToolResult>;

// Re-export ToolSet for convenience
export type { ToolSet };
