import { z } from 'zod';
import { internal } from '../../_generated/api';
import { asBigInt } from '../../lib/money';
import { stringToZod } from '../../lib/zodToString';
import {
	decisionConfigSchema,
	httpConfigSchema,
	newSkillSchema,
	simplifiedSkillSchema,
} from '../../schemas/skillSchema';
import { defineSkill, ExecutionResult, ToolExecution } from '../defineSkill';

const DEFAULT_PRE_APPROVED_COST = asBigInt({ dollars: 0.2 });

export const createSkill = defineSkill({
	preApprovedCost: 'none',
	description: 'Learn a new skill.',
	parameters: z.object({
		skill: simplifiedSkillSchema,
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
			console.debug('learning skill', args.skill);
			ensureInputSchemaIsValid(args.skill.inputSchema);

			await execution.ctx.runMutation(internal.skills.private._create, {
				userId: execution.task.owner,
				skill: newSkillSchema.parse({
					key: args.skill.key,
					description: args.skill.description,
					kind: args.skill.kind,
					inputSchema: args.skill.inputSchema,
					preApprovedCost: args.skill.isSafe ? DEFAULT_PRE_APPROVED_COST : 'none',
					// TODO: make sure to add `iterate` to the knownReactions
					knownReactions: createKnownReactions(args.skill.knownReactions),
					config: createConfig(args.skill),
					cost: args.skill.kind === 'hard' ? 0n : 'dynamic',
					owner: execution.task.owner,
					author: execution.action._id,
				}),
			});

			// enable the newly created skill
			await execution.ctx.runMutation(internal.skills.private._enableSkill, {
				userId: execution.task.owner,
				skillKey: args.skill.key,
			});

			console.debug('skill created', args.skill);

			return {
				text: `✅ ${args.skill.kind === 'hard' ? 'Hard' : 'Soft'} skill '${args.skill.key}' learned.`,
				reactions: execution.skill.knownReactions,
			};
		},
});

export function ensureInputSchemaIsValid(inputSchema: string) {
	//
	try {
		stringToZod(inputSchema);
		return true;
	} catch (error) {
		throw new Error('Invalid input schema');
	}
}

export function createKnownReactions(skillReactions?: string[]) {
	//
	const baseReactions =
		skillReactions?.map((key) => ({
			skillKey: key,
			args: {},
			condition: 'any',
		})) ?? [];

	return baseReactions.concat({
		skillKey: 'iterate',
		args: {},
		condition: 'companion',
	});
}

export function createConfig(skill: z.infer<typeof simplifiedSkillSchema>) {
	//
	switch (skill.kind) {
		//
		case 'soft':
			return decisionConfigSchema.parse({
				model: 'auto',
				instructions: skill.config.instructions,
				temperature: skill.config.temperature,
				availableSkills: skill.config.availableSkills,
				historyMode: 'since last instructed',
			});

		case 'hard':
			return httpConfigSchema.parse({
				url: skill.config.url,
				method: skill.config.method,
				headers: skill.config.headers ?? {},
				paramMappings: skill.config.paramMappings,
				body: skill.config.body,
			});
	}
}
