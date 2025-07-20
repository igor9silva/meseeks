import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internalMutation, internalQuery } from '../lib';
import { zodToString } from '../lib/zodToString';
import { builtInSkillSchema, newSkillSchema, skillOwnerSchema, skillSchema } from '../schemas/skillSchema';
import { _getUserPreferece, _setUserPreference } from '../users/preferences/private';
import { ensureInputSchemaIsValid } from './builtIn/createSkill';
import { _builtInSkills } from './builtIn/index';

// all global skills + all user-defined skills
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
	handler: async (ctx, { owner, kind }) => {
		//
		const [globals, users] = await Promise.all([
			_findAllByOwner(ctx, { owner: 'isPro', kind }), // global skills
			_findAllByOwner(ctx, { owner, kind }), // user-defined skills
		]);

		return globals.concat(users);
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
	handler: async (ctx, { owner, kind }) => {
		//
		return await ctx.db
			.query('skills')
			.withIndex('by_owner_kind', (q) =>
				kind
					? q.eq('owner', owner).eq('kind', kind) //
					: q.eq('owner', owner),
			)
			.collect();
	},
});

export const _findOne = internalQuery({
	args: {
		key: z.string(),
		owner: zid('users'),
	},
	handler: async (ctx, { key, owner }) => {
		//
		const globalSkill = await _findOneByOwner(ctx, { key, owner: 'isPro' });
		if (globalSkill) return globalSkill;

		const userSkill = await _findOneByOwner(ctx, { key, owner });
		if (userSkill) return userSkill;

		if (key in _builtInSkills) {
			//
			const builtInTool = _builtInSkills[key as keyof typeof _builtInSkills];

			return builtInSkillSchema.parse({
				key,
				description: builtInTool.description,
				inputSchema: zodToString(builtInTool.parameters),
				preApprovedCost: builtInTool.preApprovedCost,
				kind: 'built-in',
				owner: 'built-in',
				author: 'built-in',
				cost: 0n,
			});
		}

		throw new Error(`Unknown skill: ${key}`);
	},
});

export const _findOneSafe = internalQuery({
	args: {
		key: z.string(),
		owner: zid('users'),
	},
	handler: async (ctx, { key, owner }) => {
		try {
			return await _findOne(ctx, { key, owner });
		} catch (error) {
			if (error instanceof Error && error.message === `Unknown skill: ${key}`) {
				return undefined;
			}
			throw error;
		}
	},
});

export const _listAllKeys = internalQuery({
	args: {
		userId: zid('users'),
	},
	handler: async (ctx, { userId }) => {
		//
		const dbList = await _findAll(ctx, { owner: userId }).then((list) =>
			list.map((i) => ({
				key: i.key,
				description: i.description,
			})),
		);

		const builtInList = Object.keys(_builtInSkills).map((key) => ({
			key,
			description: _builtInSkills[key as keyof typeof _builtInSkills].description,
		}));

		return dbList.concat(builtInList);
	},
});

export const _listEnabledKeys = internalQuery({
	args: {
		userId: zid('users'),
	},
	handler: async (ctx, { userId }) => {
		//
		const enabledSkills = await _getUserPreferece(ctx, {
			key: 'enabledSkills',
			userId,
		});

		const isString = (value: unknown): value is string => typeof value === 'string';
		const list = Array.isArray(enabledSkills?.value) ? enabledSkills.value.filter(isString) : [];

		return list;
	},
});

export const _listEnabledSkillsWithDetails = internalQuery({
	args: {
		userId: zid('users'),
	},
	handler: async (ctx, { userId }) => {
		//
		const [enabledSkillKeys, allSkills] = await Promise.all([
			_listEnabledKeys(ctx, { userId }),
			_findAll(ctx, { owner: userId }),
		]);

		// Create a map of all available skills for fast lookup
		const allSkillsMap = new Map<string, { key: string; description: string; inputSchema: string }>();

		// Add database skills (user + global)
		for (const skill of allSkills) {
			allSkillsMap.set(skill.key, {
				key: skill.key,
				description: skill.description,
				inputSchema: skill.inputSchema,
			});
		}

		// Add built-in skills
		for (const key in _builtInSkills) {
			const builtInTool = _builtInSkills[key as keyof typeof _builtInSkills];
			allSkillsMap.set(key, {
				key,
				description: builtInTool.description,
				inputSchema: zodToString(builtInTool.parameters),
			});
		}

		// Filter to only enabled skills
		const enabledSkillsSet = new Set(enabledSkillKeys);
		const skillDetails = [];

		for (const [key, skill] of allSkillsMap) {
			if (enabledSkillsSet.has(key)) {
				skillDetails.push(skill);
			}
		}

		return skillDetails;
	},
});

export const _findOneByOwner = internalQuery({
	args: {
		key: z.string(),
		owner: skillOwnerSchema,
	},
	handler: async (ctx, { key, owner }) => {
		return await ctx.db
			.query('skills')
			.withIndex('by_owner_key', (q) => q.eq('owner', owner).eq('key', key))
			.unique();
	},
});

export const _create = internalMutation({
	args: {
		skill: newSkillSchema,
		userId: zid('users'),
	},
	handler: async (ctx, { skill, userId }) => {
		//
		// TODO: bad logic, improve this
		const existing = await _findOneSafe(ctx, { key: skill.key, owner: userId });
		if (existing) throw new Error(`Skill key '${skill.key}' in use.`);

		ensureInputSchemaIsValid(skill.inputSchema);

		return await ctx.db.insert('skills', {
			...skill,
			owner: userId,
			author: userId,
		});
	},
});

export const _update = internalMutation({
	args: {
		skill: newSkillSchema,
		userId: zid('users'),
	},
	handler: async (ctx, { skill, userId }) => {
		//
		const existing = await _findOne(ctx, { key: skill.key, owner: userId });

		if (!existing) throw new Error('Skill not found');
		if (existing.owner !== userId) throw new Error('Skill not found');
		if (!('_id' in existing)) throw new Error('Skill not found'); // built-in skills do not have an _id

		ensureInputSchemaIsValid(skill.inputSchema);

		return await ctx.db.patch(existing._id, {
			...skill,
		});
	},
});

export const _enableSkill = internalMutation({
	args: {
		userId: zid('users'),
		skillKey: z.string(),
	},
	handler: async (ctx, { userId, skillKey }) => {
		//
		const enabledSkills = await _getUserPreferece(ctx, {
			userId,
			key: 'enabledSkills',
		});

		const currentSkills = (enabledSkills?.value as string[]) ?? [];
		if (currentSkills.includes(skillKey)) return;

		await _setUserPreference(ctx, {
			userId,
			key: 'enabledSkills',
			value: currentSkills.concat(skillKey),
		});
	},
});

export const _replaceProSkills = internalMutation({
	args: {
		skills: z
			.array(skillSchema)
			.describe('Skills array object (from DEV.ts output) to replace all existing "isPro" skills with'),
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
		console.info(`Replacing Pro-managed skills (deleteUnspecified: ${deleteUnspecified})`);

		// Validate all skills have the correct owner
		for (const skill of skills) {
			if (skill.owner !== 'isPro') {
				throw new Error(`All skills must have owner "isPro", found: ${skill.owner}`);
			}
		}

		// Validate no duplicate keys in new skills
		const newSkillKeys = new Set<string>();
		for (const skill of skills) {
			if (newSkillKeys.has(skill.key)) {
				throw new Error(`Duplicate skill key found: ${skill.key}`);
			}
			newSkillKeys.add(skill.key);
		}
		console.info(`Validated ${skills.length} new skills with unique keys`);

		// Get all existing "isPro" skills
		const existingSkills = await _findAllByOwner(ctx, { owner: 'isPro' });
		console.info(`Found ${existingSkills.length} existing "isPro" skills`);

		// Create maps for easier lookup
		const existingSkillsByKey = new Map(existingSkills.map((skill) => [skill.key, skill]));

		let insertedCount = 0;
		let updatedCount = 0;
		let deletedCount = 0;
		const insertedSkillIds: string[] = [];

		// Process each new skill: insert if new, update if exists
		for (const skill of skills) {
			//
			const existingSkill = existingSkillsByKey.get(skill.key);

			if (existingSkill) {
				await ctx.db.patch(existingSkill._id, skill);
				updatedCount++;
			} else {
				const skillId = await ctx.db.insert('skills', skill);
				insertedSkillIds.push(skillId);
				insertedCount++;
				console.debug(`Inserted skill: ${skill.key}`);
			}
		}

		// Delete skills that exist but are not in the new list (only if explicitly requested)
		for (const existingSkill of existingSkills) {
			if (!newSkillKeys.has(existingSkill.key)) {
				if (deleteUnspecified) {
					await ctx.db.delete(existingSkill._id);
					deletedCount++;
					console.warn(`Deleted skill: ${existingSkill.key}`);
				} else {
					throw new Error(
						`Skill ${existingSkill.key} is not in the new list and deleteUnspecified is false. DID NOTHING.`,
					);
				}
			}
		}

		console.info(
			`Operation completed: ${insertedCount} inserted, ${updatedCount} updated, ${deletedCount} deleted`,
		);

		return {
			success: true,
			inserted: insertedCount,
			updated: updatedCount,
			deleted: deletedCount,
			skillKeys: skills.map((s) => s.key),
			deletedUnspecified: deleteUnspecified,
		};
	},
});
