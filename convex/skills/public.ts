import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { mutation, query } from '../lib';
import { NotFound } from '../lib/errors';
import { zodToString } from '../lib/zodToString';
import { builtInSkillSchema, newSkillSchema } from '../schemas/skillSchema';
import { current as getCurrentUser } from '../users/public';
import { _builtInSkills } from './builtIn';
import { _create, _findAllByOwner, _update } from './private';

export const findAllPublic = query({
	handler: async (ctx) => {
		//
		const skills = await _findAllByOwner(ctx, { owner: 'isPro' });

		// remove headers from isPro hard skills, as they may contain passwords
		for (const skill of skills) {
			if (skill.owner === 'isPro' && skill.kind === 'hard') {
				skill.config.headers = {};
			}
		}

		return skills;
	},
});

export const findAllPersonal = query({
	handler: async (ctx) => {
		const currentUser = await getCurrentUser(ctx, {});
		return await _findAllByOwner(ctx, { owner: currentUser._id });
	},
});

function buildInSkillToDoc(
	key: string, //
	skill: (typeof _builtInSkills)[keyof typeof _builtInSkills],
) {
	return builtInSkillSchema.parse({
		key,
		description: skill.description,
		inputSchema: zodToString(skill.parameters),
		preApprovedCost: skill.preApprovedCost,
		knownReactions: skill.knownReactions,
		kind: 'built-in',
		owner: 'built-in',
		author: 'built-in',
		cost: 0n,
	});
}

export const findAllInnate = query({
	handler: async (ctx) => {
		//
		const builtInTools = Object.entries(_builtInSkills)
			.filter(([_, tool]) => !tool.hidden)
			.sort(([_, a], [__, b]) => a.priority - b.priority);

		return builtInTools.map(([key, tool]) => buildInSkillToDoc(key, tool));
	},
});

export const findOneInnate = query({
	args: {
		skillKey: z.string(),
	},
	handler: async (ctx, { skillKey }) => {
		//
		const skill = _builtInSkills[skillKey as keyof typeof _builtInSkills];

		return buildInSkillToDoc(skillKey, skill);
	},
});

export const findOne = query({
	args: {
		skillId: zid('skills'),
	},
	handler: async (ctx, { skillId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const skill = await ctx.db.get(skillId);

		if (!skill) throw NotFound();

		if (skill.owner !== currentUser._id && skill.owner !== 'isPro') {
			// purposefully do not mention authorization
			throw NotFound();
		}

		// remove headers from isPro hard skills, as they may contain passwords
		if (skill.owner === 'isPro' && skill.kind === 'hard') {
			skill.config.headers = {};
		}

		return {
			...skill,
			isEditable: skill.owner === currentUser._id,
		};
	},
});

export const create = mutation({
	args: {
		skill: newSkillSchema,
	},
	handler: async (ctx, { skill }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await _create(ctx, { skill, userId: currentUser._id });
	},
});

export const update = mutation({
	args: {
		skill: newSkillSchema,
	},
	handler: async (ctx, { skill }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});

		return await _update(ctx, { skill, userId: currentUser._id });
	},
});

export const ensureSkillOwner = async (
	ctx: QueryCtx | MutationCtx, //
	args: {
		skillId: Id<'skills'>;
	},
) => {
	//
	const currentUser = await getCurrentUser(ctx, {});
	const skill = await ctx.db.get(args.skillId);

	if (!skill) throw NotFound();
	if (skill.owner !== currentUser._id) throw NotFound(); // purposefully do not mention authorization

	return { currentUser, skill };
};
