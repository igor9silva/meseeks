import { z } from 'zod/v3';
import type { Doc } from 'convex/_generated/dataModel';
import type { ActionCtx, MutationCtx } from 'convex/_generated/server';
import type { MagicRockContext } from 'convex/magicRock.private';
import type { skillSchema } from 'schemas/skillSchema';
import { _builtInSkills } from './builtIn/index';
import { createAITool } from './createAITool';
import { createBuiltInTool } from './createBuiltInTool';
import { createHTTPTool } from './createHttpTool';
import { internal } from 'convex/_generated/api';

export const _toolsForMagicRock = async (
	ctx: ActionCtx | MutationCtx, //
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
) => {
	//
	const hardSkills = await ctx.runQuery(internal.skills._findAll, {
		owner: task.owner,
		kind: 'hard',
	});

	const softSkills = await ctx.runQuery(internal.skills._findAll, {
		owner: task.owner,
		kind: 'soft',
	});

	const map = {
		...toMap(hardSkills, (skill) => createTool(ctx, task, action, skill)),
		...toMap(softSkills, (skill) => createTool(ctx, task, action, skill)),
		..._builtInTools(ctx, task, action),
	};

	Object.values(map).forEach((skill) => {
		// @ts-ignore TODO: workaround because I cannot stop AI SDK from calling execute()
		skill.execute = undefined;
	});

	return map;
};

export const _builtInTools = (
	ctx: ActionCtx | MutationCtx, //
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
) => {
	//

	return Object.keys(_builtInSkills).reduce(
		(acc, key) => {
			//
			const skill = _builtInSkills[key as keyof typeof _builtInSkills];

			acc[key] = createBuiltInTool(ctx, task, action, skill);

			return acc;
		},
		{} as Record<string, ReturnType<typeof createBuiltInTool>>,
	);
};

export function createTool(
	ctx: ActionCtx | MutationCtx, //
	task: Doc<'tasks'>,
	action: Doc<'actions'>,
	skill: z.infer<typeof skillSchema>,
	context?: MagicRockContext,
) {
	//
	// prettier-ignore
	switch (skill.kind) {
		case 'hard': return createHTTPTool(ctx, task, action, skill);
		case 'soft': return createAITool(ctx, task, action, skill, context);
		case 'built-in': {
			//
			if (skill.key in _builtInSkills) {
				const builtInSkill = _builtInSkills[skill.key as keyof typeof _builtInSkills];
				return createBuiltInTool(ctx, task, action, builtInSkill);
			}

			throw new Error(`Unknown built-in skill: ${skill.key}`);
		}
	}
}

function toMap<SkillType extends { key: string }, ReturnType>(
	skills: Array<SkillType>, //
	mapFn: (skill: SkillType) => ReturnType,
) {
	return skills.reduce(
		(acc, skill) => {
			acc[skill.key] = mapFn(skill);
			return acc;
		},
		{} as Record<string, ReturnType>,
	);
}
