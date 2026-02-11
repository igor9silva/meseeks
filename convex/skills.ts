import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, internalQuery, mutation, query } from './lib';
import { NotFound } from './lib/errors';
import { zodToString } from './lib/zodToString';
import { builtInSkillSchema, newSkillSchema, skillOwnerSchema } from './schemas/skillSchema';
import {
	create as createSkill,
	enableSkill,
	findAll,
	findAllByOwner,
	findOne as findSkill,
	findOneByOwner,
	findOneSafe,
	listAllKeys,
	listEnabledKeys,
	listEnabledSkillsWithDetails,
	replaceProSkills,
	update as updateSkill,
} from './skills.private';
import { _builtInSkills } from './skills/builtIn/index';
import { current } from './users.private';

export const _findAll = internalQuery({
	args: {
		owner: zid('users'),
		kind: z
			.enum([
				'hard', //
				'soft',
			])
			.optional()
			.describe('Filter by skill kind. Grab all if unspecified.'),
	},
	handler: async (ctx, args) => {
		//
		return await findAll(ctx, args);
	},
});

export const _findAllByOwner = internalQuery({
	args: {
		owner: skillOwnerSchema,
		kind: z
			.enum([
				'hard', //
				'soft',
			])
			.optional()
			.describe('Filter by skill kind. Grab all if unspecified.'),
	},
	handler: async (ctx, args) => {
		//
		return await findAllByOwner(ctx, args);
	},
});

export const _findOne = internalQuery({
	args: {
		key: z.string(),
		owner: zid('users'),
	},
	handler: async (ctx, args) => {
		//
		return await findSkill(ctx, args);
	},
});

export const _findOneSafe = internalQuery({
	args: {
		key: z.string(),
		owner: zid('users'),
	},
	handler: async (ctx, args) => {
		//
		return await findOneSafe(ctx, args);
	},
});

export const _listAllKeys = internalQuery({
	args: {
		userId: zid('users'),
	},
	handler: async (ctx, args) => {
		//
		return await listAllKeys(ctx, args);
	},
});

export const _listEnabledKeys = internalQuery({
	args: {
		userId: zid('users'),
	},
	handler: async (ctx, args) => {
		//
		return await listEnabledKeys(ctx, args);
	},
});

export const _listEnabledSkillsWithDetails = internalQuery({
	args: {
		userId: zid('users'),
	},
	handler: async (ctx, args) => {
		//
		return await listEnabledSkillsWithDetails(ctx, args);
	},
});

export const _findOneByOwner = internalQuery({
	args: {
		key: z.string(),
		owner: skillOwnerSchema,
	},
	handler: async (ctx, args) => {
		//
		return await findOneByOwner(ctx, args);
	},
});

export const _create = internalMutation({
	args: {
		skill: newSkillSchema,
		userId: zid('users'),
	},
	handler: async (ctx, args) => {
		//
		return await createSkill(ctx, args);
	},
});

export const _update = internalMutation({
	args: {
		skill: newSkillSchema,
		userId: zid('users'),
	},
	handler: async (ctx, args) => {
		//
		return await updateSkill(ctx, args);
	},
});

export const _enableSkill = internalMutation({
	args: {
		userId: zid('users'),
		skillKey: z.string(),
	},
	handler: async (ctx, args) => {
		//
		await enableSkill(ctx, args);
	},
});

// accepts JSON with __bigint__ markers since CLI doesn't support BigInt literals
export const _replaceProSkills = internalMutation({
	args: {
		skills: z.array(z.unknown()).describe('Skills array to replace all existing "isPro" skills with'),
		deleteUnspecified: z
			.boolean()
			.optional()
			.default(false)
			.describe(
				'If true, deletes existing "isPro" skills that are not in the new list. If false, only updates/inserts skills from the new list.',
			),
	},
	handler: async (ctx, { skills, deleteUnspecified }) => {
		//
		return await replaceProSkills(ctx, {
			skills,
			deleteUnspecified,
		});
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

function isBuiltInSkillKey(
	skillKey: string, //
): skillKey is keyof typeof _builtInSkills {
	//
	return skillKey in _builtInSkills;
}

export const findAllPublic = query({
	args: {},
	handler: async (ctx) => {
		//
		const skills = await findAllByOwner(ctx, { owner: 'isPro' });

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
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await current(ctx, {});
		return await findAllByOwner(ctx, { owner: currentUser._id });
	},
});

export const findAllInnate = query({
	args: {},
	handler: async () => {
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
		if (!isBuiltInSkillKey(skillKey)) throw NotFound();

		const skill = _builtInSkills[skillKey];

		return buildInSkillToDoc(skillKey, skill);
	},
});

export const findOne = query({
	args: {
		skillId: zid('skills'),
	},
	handler: async (ctx, { skillId }) => {
		//
		const currentUser = await current(ctx, {});
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
		const currentUser = await current(ctx, {});
		return await createSkill(ctx, { skill, userId: currentUser._id });
	},
});

export const update = mutation({
	args: {
		skill: newSkillSchema,
	},
	handler: async (ctx, { skill }) => {
		//
		const currentUser = await current(ctx, {});
		return await updateSkill(ctx, { skill, userId: currentUser._id });
	},
});

export const ensureSkillOwner = async (
	ctx: QueryCtx | MutationCtx, //
	args: {
		skillId: Id<'skills'>;
	},
) => {
	//
	const currentUser = await current(ctx, {});
	const skill = await ctx.db.get(args.skillId);

	if (!skill) throw NotFound();
	if (skill.owner !== currentUser._id) throw NotFound(); // purposefully do not mention authorization

	return { currentUser, skill };
};
