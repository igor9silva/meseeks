import { zid } from 'convex-helpers/server/zod4';
import { z } from 'zod';
import { internalAction, internalMutation, internalQuery, mutation, query } from 'lib/convex';
import { internal } from './_generated/api';
import { NotFound } from 'lib/errors';
import { newSkillSchema, simplifiedSkillKindSchema } from 'schemas/skill';
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
	removeLegacyInputSchemas,
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

// called by the deployment cleanup action so each batch has its own transaction.
export const _removeLegacyInputSchemas = internalMutation({
	args: removeLegacyInputSchemas.args,
	returns: z.object({
		isDone: z.boolean(),
		continueCursor: z.string(),
		scanned: z.number(),
		eligible: z.number(),
		removed: z.number(),
	}),
	handler: removeLegacyInputSchemas,
});

// the deploy pipeline waits for all pages before reporting success; no scheduled work is left behind.
export const _cleanupInputSchemaBackups = internalAction({
	args: { dryRun: z.boolean().default(true) },
	returns: z.null(),
	handler: async (ctx, { dryRun }): Promise<null> => {
		//
		const visit = async (dryRun: boolean) => {
			//
			let cursor: string | null = null;
			let scanned = 0;
			let eligible = 0;
			let removed = 0;
			for (;;) {
				// pin this API result to the helper to break the generated function-reference type cycle.
				const batch: Awaited<ReturnType<typeof removeLegacyInputSchemas>> = await ctx.runMutation(
					internal.skills._removeLegacyInputSchemas,
					{ cursor, dryRun },
				);
				scanned += batch.scanned;
				eligible += batch.eligible;
				removed += batch.removed;
				if (batch.isDone) return { scanned, eligible, removed };
				cursor = batch.continueCursor;
			}
		};

		// finish the complete audit before the first write, including schemas on later pages.
		const audit = await visit(true);
		console.info('Skill schema backup audit', audit);
		if (dryRun) return null;

		const cleanup = await visit(false);
		const verification = await visit(true);
		if (verification.eligible !== 0) throw new Error('Skill schema backups remain after cleanup');
		console.info('Skill schema backup cleanup complete', { ...cleanup, remaining: verification.eligible });
		return null;
	},
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
