import { z } from 'zod';
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
