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
		updatedSkill: simplifiedSkillSchema,
	}),
	knownReactions: [
		{
			skillKey: 'learn',
			args: {},
			condition: 'companion',
		},
	],
	use:
		(execution: ToolExecution) =>
		async (args): Promise<ExecutionResult> => {
			//
			console.debug('updating skill', args.updatedSkill);
			ensureInputSchemaIsValid(args.updatedSkill.inputSchema);

			await execution.ctx.runMutation(internal.skills.private._update, {
				userId: execution.task.owner,
				updatedSkill: newSkillSchema.parse({
					key: args.updatedSkill.key,
					description: args.updatedSkill.description,
					kind: args.updatedSkill.kind,
					inputSchema: args.updatedSkill.inputSchema,
					preApprovedCost: args.updatedSkill.isSafe ? asBigInt({ dollars: 0.05 }) : 'none',
					knownReactions: args.updatedSkill.knownReactions?.map((key) => ({
						skillKey: key,
						args: {},
						condition: 'any',
					})),
					config: createConfig(args.updatedSkill),
					cost: args.updatedSkill.kind === 'hard' ? 0n : 'dynamic',
					owner: execution.task.owner,
					author: execution.action._id,
				}),
			});

			console.debug('skill updated', args.updatedSkill);

			const kind = args.updatedSkill.kind === 'hard' ? 'Hard' : 'Soft';
			return {
				text: `✍️ ${kind} skill '${args.updatedSkill.key}' updated.`,
				reactions: execution.skill.knownReactions,
			};
		},
});
