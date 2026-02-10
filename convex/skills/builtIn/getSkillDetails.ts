import { z } from 'zod';
import { internal } from '../../_generated/api';
import { asDollars } from '../../lib/money';
import { skillSchema } from '../../schemas/skillSchema';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

export const getSkillDetails = defineSkill({
	preApprovedCost: 0n,
	description: 'Get detailed information about a specific skill by its key.',
	parameters: z.object({
		skillKey: z.string().describe('The key of the skill to retrieve details for'),
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
			const skill = await execution.ctx.runQuery(internal.skills._findOne, {
				key: args.skillKey,
				owner: execution.task.owner,
			});

			if (!skill) {
				return {
					text: `❌ Skill '${args.skillKey}' not found.`,
					reactions: execution.skill.knownReactions,
				};
			}

			return {
				text: JSON.stringify({
					...skill,
					cost: renderCost(skill),
					preApprovedCost: renderPreApprovedCost(skill),
				}),
				reactions: execution.skill.knownReactions,
			};
		},
});

function renderCost(skill: z.infer<typeof skillSchema>) {
	//
	if (skill.cost === 'dynamic') return 'Cost depends on selected task intelligence and token usage';
	if (skill.cost === 0n) return 'Free';

	return `${asDollars({ bigInt: skill.cost, precision: 6 })} energy per use`;
}

function renderPreApprovedCost(skill: z.infer<typeof skillSchema>) {
	//
	if (skill.preApprovedCost === 'none') return 'none';

	return `automatically authorized up to ${asDollars({ bigInt: skill.preApprovedCost, precision: 6 })} energy per use`;
}
