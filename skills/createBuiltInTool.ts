import { tool } from 'ai';
import type { Doc } from 'convex/_generated/dataModel';
import type { ActionCtx, MutationCtx } from 'convex/_generated/server';
import type { AITool } from 'schemas/toolSchema';
import type { _builtInSkills } from './builtIn/index';
import { createReactions } from './createReactions';

export function createBuiltInTool(
	ctx: ActionCtx | MutationCtx,
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	skill: (typeof _builtInSkills)[keyof typeof _builtInSkills],
): AITool {
	//
	return tool({
		description: skill.description,
		inputSchema: skill.parameters,
		execute: async (args) => {
			//
			// @ts-expect-error no time to fight this shit
			const { text, reactions } = await skill.use({ ctx, task, action, skill })(args);

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
