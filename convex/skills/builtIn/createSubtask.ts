// import { z } from 'zod';
// import { internal } from '../../_generated/api';
// import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

// export const createSubtask = defineSkill({
// 	preApprovedCost: 'none',
// 	description: 'Create a subtask',
// 	parameters: z.object({
// 		title: z.string().max(60).describe('The title of the subtask. Max 60 characters.'),
// 		instructions: z
// 			.string()
// 			.describe(
// 				'Instructions for the subtask. Make sure to add all required details so another Meseeks can handle it properly. Think through your current context carefully and send a complete and structured message.',
// 			),
// 	}),
// 	knownReactions: [],
// 	use:
// 		(execution: ToolExecution) =>
// 		async (args): Promise<ExecutionResult> => {
// 			//
// 			await execution.ctx.runMutation(internal.tasks._add, {
// 				parentId: execution.task._id,
// 				author: execution.action?._id,
// 				owner: execution.task.owner,
// 				title: args.title,
// 				instructions: args.instructions,
// 			});

// 			return {
// 				reactions: execution.skill.knownReactions,
// 			};
// 		},
// });
