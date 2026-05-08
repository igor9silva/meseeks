import { z } from 'zod/v3';
import { internal } from 'convex/_generated/api';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const render = defineSkill({
	preApprovedCost: 0n,
	description: 'Render a React component.',
	parameters: z.object({
		code: z.string().max(100000).describe('The React component code to render.'),
	}),
	knownReactions: [
		{
			skillKey: 'iterate',
			args: {},
			condition: 'companion',
		},
	],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			// TODO: remove after new reactor (that only takes action ctx)
			if (!('runAction' in execution.ctx)) {
				throw new Error('Render can only run from an action context.');
			}

			const transpiledCode = await execution.ctx.runAction(internal.babel._transpileCode, {
				code: args.code,
			});

			return {
				text: transpiledCode,
				reactions: execution.skill.knownReactions,
			};
		},
	priority: 100,
});
