import { tool } from 'ai';
import type { Doc } from 'convex/_generated/dataModel';
import type { ActionCtx, MutationCtx } from 'convex/_generated/server';
import type { AITool } from 'schemas/toolSchema';
import { createReactions } from './createReactions';
import type { defineSkill } from './defineSkill';

export function createBuiltInTool(
	ctx: ActionCtx | MutationCtx,
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	skill: Pick<ReturnType<typeof defineSkill>, 'description' | 'parameters' | 'execute'>,
): AITool {
	//
	return tool({
		description: skill.description,
		inputSchema: skill.parameters,
		execute: async (args) => {
			//
			const { text, reactions } = await skill.execute({ ctx, task, action }, args);

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
