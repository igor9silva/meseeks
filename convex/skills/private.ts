import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { internalMutation, internalQuery } from '../lib';
import { zodToString } from '../lib/zodToString';
import { builtInSkillSchema, newSkillSchema, skillOwnerSchema } from '../schemas/skillSchema';
import { _getUserPreferece, _setUserPreference } from '../users/preferences/private';
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

		return await ctx.db.insert('skills', {
			...skill,
			owner: userId,
			author: userId,
		});
	},
});

export const _update = internalMutation({
	args: {
		updatedSkill: newSkillSchema,
		userId: zid('users'),
	},
	handler: async (ctx, { updatedSkill, userId }) => {
		//
		const existing = await _findOne(ctx, { key: updatedSkill.key, owner: userId });

		if (!existing) throw new Error('Skill not found');
		if (existing.owner !== userId) throw new Error('Skill not found');
		if (!('_id' in existing)) throw new Error('Skill not found'); // built-in skills do not have an _id

		return await ctx.db.patch(existing._id, {
			...updatedSkill,
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
