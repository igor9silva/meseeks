import { z } from 'zod';
import { internal } from '../../_generated/api';
import { asBigInt } from '../../lib/money';
import { newSkillSchema, simplifiedSkillSchema } from '../../schemas/skillSchema';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';
import { createConfig, ensureInputSchemaIsValid } from './createSkill';

export const updateSkill = defineSkill({
	preApprovedCost: 'none',
	description: 'Update details of a skill we already know.',
	parameters: z.object({
		skill: simplifiedSkillSchema,
	}),
	knownReactions: [
		{
			skillKey: 'learnSkill',
			args: {},
			condition: 'companion',
		},
	],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			console.debug('updating skill', args.skill);
			ensureInputSchemaIsValid(args.skill.inputSchema);

			const { skill } = args;

			await execution.ctx.runMutation(internal.skills.private._update, {
				userId: execution.task.owner,
				skill: newSkillSchema.parse({
					key: skill.key,
					description: skill.description,
					kind: skill.kind,
					inputSchema: skill.inputSchema,
					preApprovedCost: skill.isSafe ? asBigInt({ dollars: 0.05 }) : 'none',
					knownReactions: skill.knownReactions?.map((key) => ({
						skillKey: key,
						args: {},
						condition: 'any',
					})),
					config: createConfig(skill),
					cost: skill.kind === 'hard' ? 0n : 'dynamic',
					owner: execution.task.owner,
					author: execution.action._id,
				}),
			});

			console.debug('skill updated', skill);

			const kind = skill.kind === 'hard' ? 'Hard' : 'Soft';
			return {
				text: `✍️ ${kind} skill '${skill.key}' updated.`,
				reactions: execution.skill.knownReactions,
			};
		},
});
