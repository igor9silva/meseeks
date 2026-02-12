import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { defineMutation, defineQuery } from 'lib/functions';
import { bigIntFromJSON } from 'lib/bigintJson';
import { NotFound } from 'lib/errors';
import { zodToString } from 'lib/zodToString';
import { builtInSkillSchema, newSkillSchema, skillOwnerSchema, skillSchema } from 'schemas/skillSchema';
import { ensureInputSchemaIsValid } from 'skills/builtIn/createSkill';
import { _builtInSkills } from 'skills/builtIn/index';

const findAllByOwnerImpl = async (
	ctx: QueryCtx | MutationCtx,
	{
		owner,
		kind,
	}: {
		owner: z.infer<typeof skillOwnerSchema>;
		kind?: 'hard' | 'soft' | undefined;
	},
) => {
	//
	return await ctx.db
		.query('skills')
		.withIndex('by_owner_kind', (q) =>
			kind
				? q.eq('owner', owner).eq('kind', kind) //
				: q.eq('owner', owner),
		)
		.collect();
};

const findOneByOwnerImpl = async (
	ctx: QueryCtx | MutationCtx,
	{
		key,
		owner,
	}: {
		key: string;
		owner: z.infer<typeof skillOwnerSchema>;
	},
) => {
	//
	return await ctx.db
		.query('skills')
		.withIndex('by_owner_key', (q) => q.eq('owner', owner).eq('key', key))
		.unique();
};

const findAllImpl = async (
	ctx: QueryCtx | MutationCtx,
	{
		owner,
		kind,
	}: {
		owner: Id<'users'>;
		kind?: 'hard' | 'soft' | undefined;
	},
) => {
	//
	const [globals, users] = await Promise.all([
		findAllByOwnerImpl(ctx, { owner: 'isPro', kind }), // global skills
		findAllByOwnerImpl(ctx, { owner, kind }), // user-defined skills
	]);

	return globals.concat(users);
};

const findOneImpl = async (
	ctx: QueryCtx | MutationCtx,
	{
		key,
		owner,
	}: {
		key: string;
		owner: Id<'users'>;
	},
) => {
	//
	const globalSkill = await findOneByOwnerImpl(ctx, { key, owner: 'isPro' });
	if (globalSkill) return globalSkill;

	const userSkill = await findOneByOwnerImpl(ctx, { key, owner });
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
};

const findOneSafeImpl = async (
	ctx: QueryCtx | MutationCtx,
	{
		key,
		owner,
	}: {
		key: string;
		owner: Id<'users'>;
	},
) => {
	//
	try {
		return await findOneImpl(ctx, { key, owner });
	} catch (error) {
		if (error instanceof Error && error.message === `Unknown skill: ${key}`) {
			return undefined;
		}
		throw error;
	}
};

const getUserPreference = async (
	ctx: QueryCtx | MutationCtx,
	{
		userId,
		key,
	}: {
		userId: Id<'users'>;
		key: string;
	},
) => {
	//
	return await ctx.db
		.query('user_preferences')
		.withIndex('by_owner_key', (q) => q.eq('owner', userId).eq('key', key))
		.unique();
};

const setUserPreference = async (
	ctx: MutationCtx,
	{
		userId,
		key,
		value,
	}: {
		userId: Id<'users'>;
		key: string;
		value: unknown;
	},
) => {
	//
	const preference = await getUserPreference(ctx, { userId, key });

	if (!preference) {
		await ctx.db.insert('user_preferences', { owner: userId, key, value });
	} else {
		await ctx.db.patch(preference._id, { value });
	}
};

const listEnabledKeysImpl = async (
	ctx: QueryCtx | MutationCtx, //
	{ userId }: { userId: Id<'users'> },
) => {
	//
	const enabledSkills = await getUserPreference(ctx, {
		key: 'enabledSkills',
		userId,
	});

	const isString = (value: unknown): value is string => typeof value === 'string';

	return Array.isArray(enabledSkills?.value) ? enabledSkills.value.filter(isString) : [];
};

const listAllKeysImpl = async (
	ctx: QueryCtx | MutationCtx,
	{
		userId,
	}: {
		userId: Id<'users'>;
	},
) => {
	//
	const dbList = await findAllImpl(ctx, { owner: userId }).then((list) =>
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
};

const listEnabledSkillsWithDetailsImpl = async (
	ctx: QueryCtx | MutationCtx,
	{
		userId,
	}: {
		userId: Id<'users'>;
	},
) => {
	//
	const [enabledSkillKeys, allSkills] = await Promise.all([
		listEnabledKeysImpl(ctx, { userId }),
		findAllImpl(ctx, { owner: userId }),
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
};

const createImpl = async (
	ctx: MutationCtx,
	{
		skill,
		userId,
	}: {
		skill: z.infer<typeof newSkillSchema>;
		userId: Id<'users'>;
	},
) => {
	//
	// TODO: bad logic, improve this
	const existing = await findOneSafeImpl(ctx, { key: skill.key, owner: userId });
	if (existing) throw new Error(`Skill key '${skill.key}' in use.`);

	ensureInputSchemaIsValid(skill.inputSchema);

	return await ctx.db.insert('skills', {
		...skill,
		owner: userId,
		author: userId,
	});
};

const updateImpl = async (
	ctx: MutationCtx,
	{
		skill,
		userId,
	}: {
		skill: z.infer<typeof newSkillSchema>;
		userId: Id<'users'>;
	},
) => {
	//
	const existing = await findOneImpl(ctx, { key: skill.key, owner: userId });

	if (!existing) throw NotFound();
	if (existing.owner !== userId) throw NotFound();
	if (!('_id' in existing)) throw NotFound(); // built-in skills do not have an _id

	ensureInputSchemaIsValid(skill.inputSchema);

	return await ctx.db.patch(existing._id, {
		...skill,
	});
};

const enableSkillImpl = async (
	ctx: MutationCtx,
	{
		userId,
		skillKey,
	}: {
		userId: Id<'users'>;
		skillKey: string;
	},
) => {
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
};

const replaceProSkillsImpl = async (
	ctx: MutationCtx,
	{
		skills: rawSkills,
		deleteUnspecified,
	}: {
		skills: Array<unknown>;
		deleteUnspecified: boolean;
	},
) => {
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
	const existingSkills = await findAllByOwnerImpl(ctx, { owner: 'isPro' });
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

	console.info(`Operation completed: ${insertedCount} inserted, ${updatedCount} updated, ${deletedCount} deleted`);

	return {
		success: true,
		inserted: insertedCount,
		updated: updatedCount,
		deleted: deletedCount,
		skillKeys: skills.map((skill) => skill.key),
		deletedUnspecified: deleteUnspecified,
	};
};

export const findAllByOwner = defineQuery({
	args: z.object({
		owner: skillOwnerSchema,
		kind: z.enum(['hard', 'soft']).optional(),
	}),
	handler: async (ctx, args) => {
		//
		return await findAllByOwnerImpl(ctx, args);
	},
});

export const findOneByOwner = defineQuery({
	args: z.object({
		key: z.string(),
		owner: skillOwnerSchema,
	}),
	handler: async (ctx, args) => {
		//
		return await findOneByOwnerImpl(ctx, args);
	},
});

export const findAll = defineQuery({
	args: z.object({
		owner: zid('users'),
		kind: z.enum(['hard', 'soft']).optional(),
	}),
	handler: async (ctx, args) => {
		//
		return await findAllImpl(ctx, args);
	},
});

export const findOne = defineQuery({
	args: z.object({
		key: z.string(),
		owner: zid('users'),
	}),
	handler: async (ctx, args) => {
		//
		return await findOneImpl(ctx, args);
	},
});

export const findOneSafe = defineQuery({
	args: z.object({
		key: z.string(),
		owner: zid('users'),
	}),
	handler: async (ctx, args) => {
		//
		return await findOneSafeImpl(ctx, args);
	},
});

export const listEnabledKeys = defineQuery({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, args) => {
		//
		return await listEnabledKeysImpl(ctx, args);
	},
});

export const listAllKeys = defineQuery({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, args) => {
		//
		return await listAllKeysImpl(ctx, args);
	},
});

export const listEnabledSkillsWithDetails = defineQuery({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, args) => {
		//
		return await listEnabledSkillsWithDetailsImpl(ctx, args);
	},
});

export const create = defineMutation({
	args: z.object({
		skill: newSkillSchema,
		userId: zid('users'),
	}),
	handler: async (ctx, args) => {
		//
		return await createImpl(ctx, args);
	},
});

export const update = defineMutation({
	args: z.object({
		skill: newSkillSchema,
		userId: zid('users'),
	}),
	handler: async (ctx, args) => {
		//
		return await updateImpl(ctx, args);
	},
});

export const enableSkill = defineMutation({
	args: z.object({
		userId: zid('users'),
		skillKey: z.string(),
	}),
	handler: async (ctx, args) => {
		//
		await enableSkillImpl(ctx, args);
	},
});

// accepts JSON with __bigint__ markers since CLI doesn't support BigInt literals
export const replaceProSkills = defineMutation({
	args: z.object({
		skills: z.array(z.unknown()),
		deleteUnspecified: z.boolean().optional().default(false),
	}),
	handler: async (ctx, args) => {
		//
		return await replaceProSkillsImpl(ctx, args);
	},
});
