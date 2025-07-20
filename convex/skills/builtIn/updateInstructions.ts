import { z } from 'zod';
import { internal } from '../../_generated/api';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const updateInstructions = defineSkill({
	preApprovedCost: 0n,
	description: 'Updates the task.',
	parameters: z.object({
		title: z
			.string()
			.optional()
			.describe('A short title for the task. **Max 60 characters** (will truncate if longer).'),
		instructions: z
			.string()
			.optional()
			.describe(`MDX. Add any details on how to handle the task, what should be done, how, references, etc.`),
		summary: z
			.string() //
			.optional()
			.describe(`MDX. Add any details on what we have done so far. Bullet points are preferred.`),
		availableSkills: z
			.array(z.string())
			.max(16)
			.optional()
			.describe(
				'List of skill keys available for this task. Select up to 16 skills that will be available for this tasks. Make sure to select the most relevant skills for completing this task.',
			),
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
			const MAX_TITLE_LENGTH = 60;
			const isTitleTruncated = args.title && args.title.length > MAX_TITLE_LENGTH;

			await execution.ctx.runMutation(internal.tasks.private._updateInstructions, {
				taskId: execution.task._id,
				title: isTitleTruncated ? args.title?.slice(0, MAX_TITLE_LENGTH).trim() + '...' : args.title,
				instructions: args.instructions,
				summary: args.summary,
				availableSkills: args.availableSkills,
			});

			return {
				text:
					args.title && args.title.length > MAX_TITLE_LENGTH
						? `WARNING: Title was truncated to ${MAX_TITLE_LENGTH} characters (from ${args.title.length} characters).`
						: undefined,
				reactions: execution.skill.knownReactions,
			};
		},
});
