import { zid } from 'convex-helpers/server/zod3';
import type { Doc } from './_generated/dataModel';
import { internalMutation, internalQuery, mutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { newSkillSchema, skillKeySchema, skillKindSchema } from 'schemas/skillSchema';
import {
	createSkill,
	findAllSkills,
	findAllSkillsByOwner,
	findAllSkillKeys,
	findAllSkillsWithDetails,
	findSkill,
	findSkillsForRoot,
	replaceProSkills,
	updateSkill,
} from './skills.private';
import { ensureScopeOwner } from './files.private';
import { getCurrentUser } from './users.private';
import { findInstinct, listInstincts } from './instincts/index.private';

export const _findAll = internalQuery({
	args: {
		owner: zid('users'),
		kind: skillKindSchema.optional(),
	},
	handler: findAllSkills,
});

export const _findOne = internalQuery({
	args: {
		key: skillKeySchema,
		owner: zid('users'),
		root: zid('files').optional(),
	},
	handler: findSkill,
});

export const _findAllKeys = internalQuery({
	args: {
		userId: zid('users'),
	},
	handler: findAllSkillKeys,
});

export const _findAllSkillsWithDetails = internalQuery({
	args: {
		userId: zid('users'),
	},
	handler: findAllSkillsWithDetails,
});

export const _replaceProSkills = internalMutation({
	args: replaceProSkills.args,
	handler: replaceProSkills,
});

export const findAllPublic = query({
	args: {},
	handler: async (ctx) => {
		//
		const skills = await findAllSkillsByOwner(ctx, { owner: 'isPro' });

		return skills.map((skill) => redactSkill(skill));
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

export const findByRoot = query({
	args: {
		root: zid('files'),
	},
	handler: async (ctx, { root }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const actionRoot = await ensureScopeOwner(ctx, {
			owner: currentUser._id,
			directory: root,
		});

		const skills = await findSkillsForRoot(ctx, {
			owner: currentUser._id,
			root: actionRoot._id,
		});

		return skills.map((skill) => redactSkill(skill));
	},
});

export const findAllInstincts = query({
	args: {},
	handler: async () => {
		//
		return listInstincts().map((skill) => ({
			key: skill.key,
			kind: skill.kind,
			description: skill.description,
			inputSchema: skill.inputSchema,
			outputSchema: skill.outputSchema,
		}));
	},
});

export const findOneInstinct = query({
	args: {
		skillKey: skillKeySchema,
	},
	handler: async (_ctx, { skillKey }) => {
		//
		const skill = findInstinct(skillKey);
		if (!skill) throw NotFound();

		return {
			key: skill.key,
			kind: skill.key,
			description: skill.description,
			inputSchema: skill.inputSchema,
			outputSchema: skill.outputSchema,
			isEditable: false,
		};
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
		if (skill.owner !== currentUser._id && skill.owner !== 'isPro') throw NotFound();

		return {
			...redactSkill(skill),
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

function redactSkill(skill: Doc<'skills'>) {
	//
	if (skill.owner !== 'isPro') return skill;
	if (skill.source === 'instinct') return skill;
	if (skill.kind !== 'request') return skill;
	if (!skill.config || typeof skill.config !== 'object' || !('headers' in skill.config)) return skill;

	return {
		...skill,
		config: {
			...skill.config,
			headers: undefined,
		},
	};
}
