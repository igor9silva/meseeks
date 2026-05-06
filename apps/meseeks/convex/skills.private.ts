import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Id } from './_generated/dataModel';
import { defineMutation, defineQuery } from 'lib/convex';
import { bigIntFromJSON } from 'lib/bigintJson';
import { NotFound } from 'lib/errors';
import { zodToString } from 'lib/zodToString';
import {
	builtInSkillSchema,
	newSkillSchema,
	simplifiedSkillKindSchema,
	skillOwnerSchema,
	skillSchema,
} from 'schemas/skillSchema';
import { ensureInputSchemaIsValid } from 'skills/builtIn/createSkill';
import { _builtInSkills } from 'skills/builtIn/index';
import { getCurrentUser } from './users.private';

export function buildInSkillToDoc(
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

export function isBuiltInSkillKey(
	skillKey: string, //
): skillKey is keyof typeof _builtInSkills {
	//
	return skillKey in _builtInSkills;
}

export const ensureSkillOwner = defineQuery({
	args: z.object({
		skillId: zid('skills'),
	}),
	handler: async (ctx, { skillId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const skill = await ctx.db.get(skillId);

		if (!skill) throw NotFound();
		if (skill.owner !== currentUser._id) throw NotFound(); // purposefully do not mention authorization

		return { currentUser, skill };
	},
});

const getUserPreference = defineQuery({
	args: z.object({
		userId: zid('users'),
		key: z.string(),
	}),
	handler: async (ctx, { userId, key }) => {
		//
		return await ctx.db
			.query('user_preferences')
			.withIndex('by_owner_key', (q) => q.eq('owner', userId).eq('key', key))
			.unique();
	},
});

const setUserPreference = defineMutation({
	args: z.object({
		userId: zid('users'),
		key: z.string(),
		value: z.unknown(),
	}),
	handler: async (ctx, { userId, key, value }) => {
		//
		const preference = await getUserPreference(ctx, { userId, key });

		if (!preference) {
			await ctx.db.insert('user_preferences', { owner: userId, key, value });
		} else {
			await ctx.db.patch(preference._id, { value });
		}
	},
});

export const findEnabledSkillKeys = defineQuery({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		//
		const enabledSkills = await getUserPreference(ctx, {
			key: 'enabledSkills',
			userId,
		});

		const isString = (value: unknown): value is string => typeof value === 'string';

		return Array.isArray(enabledSkills?.value) ? enabledSkills.value.filter(isString) : [];
	},
});

export const findAllSkillKeys = defineQuery({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		//
		const dbList = await findAllSkills(ctx, { owner: userId }).then((list) =>
			list.map((skill) => ({
				key: skill.key,
				description: skill.description,
			})),
		);

		const builtInList = Object.entries(_builtInSkills).map(([key, builtInTool]) => ({
			key,
			description: builtInTool.description,
		}));

		return dbList.concat(builtInList);
	},
});

export const findEnabledSkillsWithDetails = defineQuery({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		//
		const [enabledSkillKeys, allSkills] = await Promise.all([
			findEnabledSkillKeys(ctx, { userId }),
			findAllSkills(ctx, { owner: userId }),
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
		for (const [key, builtInTool] of Object.entries(_builtInSkills)) {
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

export const createSkill = defineMutation({
	args: z.object({
		skill: newSkillSchema,
		userId: zid('users'),
	}),
	handler: async (ctx, { skill, userId }) => {
		//
		// TODO: bad logic, improve this
		const existing = await findSkillSafe(ctx, { key: skill.key, owner: userId });
		if (existing) throw new Error(`Skill key '${skill.key}' in use.`);

		ensureInputSchemaIsValid(skill.inputSchema);

		return await ctx.db.insert('skills', {
			...skill,
			owner: userId,
			author: userId,
		});
	},
});

export const updateSkill = defineMutation({
	args: z.object({
		skill: newSkillSchema,
		userId: zid('users'),
	}),
	handler: async (ctx, { skill, userId }) => {
		//
		const existing = await findSkill(ctx, { key: skill.key, owner: userId });

		if (!existing) throw NotFound();
		if (existing.owner !== userId) throw NotFound();
		if (!('_id' in existing)) throw NotFound(); // built-in skills do not have an _id

		ensureInputSchemaIsValid(skill.inputSchema);

		return await ctx.db.patch(existing._id, {
			...skill,
		});
	},
});

export const enableSkill = defineMutation({
	args: z.object({
		userId: zid('users'),
		skillKey: z.string(),
	}),
	handler: async (ctx, { userId, skillKey }) => {
		//
		const enabledSkills = await getUserPreference(ctx, {
			userId,
			key: 'enabledSkills',
		});

		const isString = (value: unknown): value is string => typeof value === 'string';
		const currentSkills = Array.isArray(enabledSkills?.value) ? enabledSkills.value.filter(isString) : [];
		if (currentSkills.includes(skillKey)) return;

		await setUserPreference(ctx, {
			userId,
			key: 'enabledSkills',
			value: currentSkills.concat(skillKey),
		});
	},
});

export const replaceProSkills = defineMutation({
	args: z.object({
		skills: z.array(z.unknown()),
		deleteUnspecified: z.boolean().optional().default(false),
	}),
	handler: async (ctx, { skills: rawSkills, deleteUnspecified }) => {
		//
		// convert __bigint__ markers back to BigInt
		const skills = rawSkills.map((skill: unknown) => {
			//
			const converted = bigIntFromJSON(skill);
			return skillSchema.parse(converted);
		});

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
		const existingSkills = await findAllSkillsByOwner(ctx, { owner: 'isPro' });
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
			skillKeys: skills.map((skill) => skill.key),
			deletedUnspecified: deleteUnspecified,
		};
	},
});

export const findAllSkillsByOwner = defineQuery({
	args: z.object({
		owner: skillOwnerSchema,
		kind: simplifiedSkillKindSchema.optional(),
	}),
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

export const findSkillByOwner = defineQuery({
	args: z.object({
		key: z.string(),
		owner: skillOwnerSchema,
	}),
	handler: async (ctx, { key, owner }) => {
		//
		return await ctx.db
			.query('skills')
			.withIndex('by_owner_key', (q) => q.eq('owner', owner).eq('key', key))
			.unique();
	},
});

export const findAllSkills = defineQuery({
	args: z.object({
		owner: zid('users'),
		kind: simplifiedSkillKindSchema.optional(),
	}),
	handler: async (ctx, { owner, kind }) => {
		//
		const [globals, users] = await Promise.all([
			findAllSkillsByOwner(ctx, { owner: 'isPro', kind }), // global skills
			findAllSkillsByOwner(ctx, { owner, kind }), // user-defined skills
		]);

		return globals.concat(users);
	},
});

export const findSkill = defineQuery({
	args: z.object({
		key: z.string(),
		owner: zid('users'),
	}),
	handler: async (ctx, { key, owner }) => {
		//
		const globalSkill = await findSkillByOwner(ctx, { key, owner: 'isPro' });
		if (globalSkill) return globalSkill;

		const userSkill = await findSkillByOwner(ctx, { key, owner });
		if (userSkill) return userSkill;

		const builtInSkillEntry = Object.entries(_builtInSkills).find(([skillKey]) => skillKey === key);

		if (builtInSkillEntry) {
			//
			const [, builtInTool] = builtInSkillEntry;

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

export const findSkillSafe = defineQuery({
	args: z.object({
		key: z.string(),
		owner: zid('users'),
	}),
	handler: async (ctx, { key, owner }) => {
		//
		try {
			return await findSkill(ctx, { key, owner });
		} catch (error) {
			if (error instanceof Error && error.message === `Unknown skill: ${key}`) {
				return undefined;
			}
			throw error;
		}
	},
});
