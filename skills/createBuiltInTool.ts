import { tool } from 'ai';
import type { Doc } from 'convex/_generated/dataModel';
import type { ActionCtx, MutationCtx } from 'convex/_generated/server';
import type { AITool } from 'schemas/toolSchema';
import type { z } from 'zod';
import { createReactions } from './createReactions';
import type { Skill, ToolExecution } from './defineSkill';

export function createBuiltInTool<T extends z.AnyZodObject>(
	ctx: ActionCtx | MutationCtx,
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	skill: Skill<T>,
): AITool {
	//
	const execution: ToolExecution<T> = { ctx, task, action, skill };

	return tool({
		description: skill.description,
		inputSchema: skill.parameters,
		execute: async (args) => {
			//
			const { text, reactions } = await skill.use(execution)(args);

			return {
				result: {
					...(text ? { text } : {}),
					reactions: createReactions(action, reactions),
				},
				costs: [
					{
						symbol: 'USD',
						amount: 0n,
						description: 'Built-in skills are free of charge.',
					},
				],
			};
		},
	});
}
