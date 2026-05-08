import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internalMutation, internalQuery, mutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { newSkillSchema, simplifiedSkillKindSchema } from 'schemas/skillSchema';
import {
	buildInSkillToDoc,
	createSkill,
	enableSkill,
	findAllSkills,
	findAllSkillsByOwner,
	findAllSkillKeys,
	findEnabledSkillsWithDetails,
	findSkill,
	isBuiltInSkillKey,
	replaceProSkills,
	updateSkill,
} from './skills.private';
import { _builtInSkills } from 'skills/builtIn/index';
import { getCurrentUser } from './users.private';

// used by skills/tools.ts to load hard/soft skill docs before building ai tool definitions
export const _findAll = internalQuery({
	args: {
		owner: zid('users'),
		kind: simplifiedSkillKindSchema.optional().describe('Filter by skill kind. Grab all if unspecified.'),
	},
	handler: findAllSkills,
});

// used by builtIn/getSkillDetails.ts so the ai can inspect one skill by key/owner
export const _findOne = internalQuery({
	args: {
		key: z.string(),
		owner: zid('users'),
	},
	handler: findSkill,
});

// used by magicRock.private.ts to expand {{allSkills}} in system instructions
export const _findAllKeys = internalQuery({
	args: {
		userId: zid('users'),
	},
	handler: findAllSkillKeys,
});

// used by magicRock.private.ts to expand {{activeSkills}} with enabled skill schemas
export const _findEnabledSkillsWithDetails = internalQuery({
	args: {
		userId: zid('users'),
	},
	handler: findEnabledSkillsWithDetails,
});

// called by builtIn/createSkill.ts to persist a generated skill from tool execution
export const _create = internalMutation({
	args: {
		skill: newSkillSchema,
		userId: zid('users'),
	},
	handler: createSkill,
});

// called by builtIn/updateSkill.ts to patch a skill from tool execution
export const _update = internalMutation({
	args: {
		skill: newSkillSchema,
		userId: zid('users'),
	},
	handler: updateSkill,
});

// called by builtIn/createSkill.ts and builtIn/updateSkill.ts to enable the created/updated skill
export const _enableSkill = internalMutation({
	args: {
		userId: zid('users'),
		skillKey: z.string(),
	},
	handler: enableSkill,
});

// called by private/skills/deploy.ts to sync the db-backed isPro skill catalog
export const _replaceProSkills = internalMutation({
	args: replaceProSkills.args,
	handler: replaceProSkills,
});

export const findAllPublic = query({
	args: {},
	handler: async (ctx) => {
		//
		const skills = await findAllSkillsByOwner(ctx, { owner: 'isPro' });

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
		const currentUser = await getCurrentUser(ctx, {});
		return await findAllSkillsByOwner(ctx, { owner: currentUser._id });
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
		return await createSkill(ctx, { skill, userId: currentUser._id });
	},
});

export const update = mutation({
	args: {
		skill: newSkillSchema,
	},
	handler: async (ctx, { skill }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await updateSkill(ctx, { skill, userId: currentUser._id });
	},
});
