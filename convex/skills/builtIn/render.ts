import { z } from 'zod';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const render = defineSkill({
	preApprovedCost: 0n,
	description: 'Render a React component',
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
			return {
				text: args.code,
				reactions: execution.skill.knownReactions,
			};
		},
});
