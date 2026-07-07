import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { defineMutation, defineQuery } from 'lib/convex';
import { bigIntFromJSON } from 'lib/bigintJson';
import { NotFound } from 'lib/errors';
import {
	newSkillSchema,
	preApprovedCostSchema,
	skillCostSchema,
	skillKeySchema,
	skillKindSchema,
	skillOwnerSchema,
	skillSchema,
} from 'schemas/skillSchema';
import { findInstinct, listInstincts } from './instincts/index.private';

export const findAllSkillKeys = defineQuery({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		//
		const skills = await findAllSkills(ctx, { owner: userId });

		return skills.map((skill) => ({
			key: skill.key,
			description: skill.description,
		}));
	},
});

export const findAllSkillsWithDetails = defineQuery({
	args: z.object({
		userId: zid('users'),
	}),
	handler: async (ctx, { userId }) => {
		//
		const allSkills = await findAllSkills(ctx, { owner: userId });

		return allSkills.map((skill) => ({
			key: skill.key,
			description: skill.description,
			inputSchema: skill.inputSchema,
		}));
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
		if (findInstinct(skill.key)) throw new Error(`Skill key '${skill.key}' is reserved.`);

		const existing = await findSkillSafe(ctx, { key: skill.key, owner: userId });
		if (existing) throw new Error(`Skill key '${skill.key}' in use.`);

		return await ctx.db.insert('skills', {
			...skill,
			owner: userId,
			author: userId,
			source: 'manual',
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
		if (findInstinct(skill.key)) throw new Error(`Skill key '${skill.key}' is reserved.`);

		const existing = await findSkill(ctx, { key: skill.key, owner: userId });

		if (!existing) throw NotFound();
		if (existing.owner !== userId) throw NotFound();

		return await ctx.db.patch(existing._id, {
			...skill,
			source: 'manual',
		});
	},
});

export const ensureInstinctSkillRows = defineMutation({
	args: z.object({}),
	handler: async (ctx) => {
		//
		const existingSkills = await findAllSkillsByOwner(ctx, { owner: 'isPro' });
		const existingByKey = new Map(existingSkills.map((skill) => [skill.key, skill]));
		const seen = new Set<string>();
		let inserted = 0;
		let updated = 0;

		for (const instinct of listInstincts()) {
			const row = skillSchema.parse({
				key: instinct.key,
				description: instinct.description,
				inputSchema: instinct.inputSchema,
				outputSchema: instinct.outputSchema,
				preApprovedCost: preApprovedCostSchema.parse('none'),
				owner: 'isPro',
				author: 'isPro',
				source: 'instinct',
				kind: instinct.kind,
				cost: skillCostSchema.parse('dynamic'),
				config: {},
				isHidden: false,
				priority: 0,
			});
			seen.add(row.key);

			const existing = existingByKey.get(row.key);
			if (existing) {
				await ctx.db.patch(existing._id, row);
				updated += 1;
				continue;
			}

			await ctx.db.insert('skills', row);
			inserted += 1;
		}

		for (const skill of existingSkills) {
			if (skill.source !== 'instinct') continue;
			if (seen.has(skill.key)) continue;

			await ctx.db.delete(skill._id);
		}

		return { inserted, updated };
	},
});

export async function replaceCompiledSkillsForRoot(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		root: Id<'files'>;
		action: Id<'actions'>;
		skills: Array<{
			key: string;
			description: string;
			kind: 'think' | 'request' | 'execute';
			inputSchema: string;
			outputSchema: string;
			config: Record<string, unknown>;
			sourceFile: Id<'files'>;
			sourcePath: string;
			sourceHash?: string;
		}>;
	},
) {
	//
	const existing = await ctx.db
		.query('skills')
		.withIndex('by_owner_kind', (q) => q.eq('owner', args.owner))
		.collect();
	const existingCompiled = existing.filter((skill) => skill.source === 'file' && skill.root === args.root);
	const existingByKey = new Map(existingCompiled.map((skill) => [skill.key, skill]));
	const nextKeys = new Set<string>();
	const compiledAt = Date.now();

	for (const skill of args.skills) {
		nextKeys.add(skill.key);
		const row = skillSchema.parse({
			key: skill.key,
			description: skill.description,
			inputSchema: skill.inputSchema,
			outputSchema: skill.outputSchema,
			preApprovedCost: preApprovedCostSchema.parse('none'),
			owner: args.owner,
			author: args.action,
			source: 'file',
			root: args.root,
			sourceFile: skill.sourceFile,
			sourcePath: skill.sourcePath,
			sourceHash: skill.sourceHash,
			compiledBy: args.action,
			compiledAt,
			kind: skill.kind,
			cost: skill.kind === 'request' ? 0n : 'dynamic',
			config: skill.config,
		});

		const existingSkill = existingByKey.get(row.key);
		if (existingSkill) {
			await ctx.db.patch(existingSkill._id, row);
			continue;
		}

		await ctx.db.insert('skills', row);
	}

	for (const skill of existingCompiled) {
		if (nextKeys.has(skill.key)) continue;

		await ctx.db.delete(skill._id);
	}
}

export const replaceProSkills = defineMutation({
	args: z.object({
		skills: z.array(z.unknown()),
		deleteUnspecified: z.boolean().optional().default(false),
	}),
	handler: async (ctx, { skills: rawSkills, deleteUnspecified }) => {
		//
		const skills = rawSkills.map((skill) => skillSchema.parse(normalizeLegacySkill(bigIntFromJSON(skill))));

		for (const skill of skills) {
			if (findInstinct(skill.key)) throw new Error(`Skill key '${skill.key}' is reserved.`);
			if (skill.owner !== 'isPro') {
				throw new Error(`All skills must have owner "isPro", found: ${skill.owner}`);
			}
		}

		const newSkillKeys = new Set<string>();
		for (const skill of skills) {
			if (newSkillKeys.has(skill.key)) throw new Error(`Duplicate skill key found: ${skill.key}`);
			newSkillKeys.add(skill.key);
		}

		const existingSkills = await findAllSkillsByOwner(ctx, { owner: 'isPro' });
		const existingSkillsByKey = new Map(existingSkills.map((skill) => [skill.key, skill]));
		let inserted = 0;
		let updated = 0;
		let deleted = 0;

		for (const skill of skills) {
			const existingSkill = existingSkillsByKey.get(skill.key);

			if (existingSkill) {
				await ctx.db.patch(existingSkill._id, skill);
				updated += 1;
				continue;
			}

			await ctx.db.insert('skills', skill);
			inserted += 1;
		}

		for (const existingSkill of existingSkills) {
			if (newSkillKeys.has(existingSkill.key)) continue;
			if (!deleteUnspecified) throw new Error(`Skill ${existingSkill.key} is not in the new list.`);

			await ctx.db.delete(existingSkill._id);
			deleted += 1;
		}

		return {
			inserted,
			updated,
			deleted,
			skillKeys: skills.map((skill) => skill.key),
			deletedUnspecified: deleteUnspecified,
		};
	},
});

export const findAllSkillsByOwner = defineQuery({
	args: z.object({
		owner: skillOwnerSchema,
		kind: skillKindSchema.optional(),
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
		key: skillKeySchema,
		owner: skillOwnerSchema,
		root: zid('files').optional(),
	}),
	handler: async (ctx, { key, owner, root }) => {
		//
		if (root) {
			const scoped = await ctx.db
				.query('skills')
				.withIndex('by_owner_root_key', (q) =>
					q
						.eq('owner', owner) //
						.eq('root', root)
						.eq('key', key),
				)
				.unique();
			if (scoped) return scoped;
		}

		const unscoped = await ctx.db
			.query('skills')
			.withIndex('by_owner_key', (q) => q.eq('owner', owner).eq('key', key))
			.collect();

		return unscoped.find((skill) => !skill.root);
	},
});

export const findAllSkills = defineQuery({
	args: z.object({
		owner: zid('users'),
		kind: skillKindSchema.optional(),
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

export const findSkillsForRoot = defineQuery({
	args: z.object({
		owner: zid('users'),
		root: zid('files'),
	}),
	handler: async (ctx, { owner, root }) => {
		//
		const [globals, personal] = await Promise.all([
			findAllSkillsByOwner(ctx, { owner: 'isPro' }),
			findAllSkillsByOwner(ctx, { owner }),
		]);
		const rows = new Map<string, Doc<'skills'>>();

		for (const skill of globals) {
			if (skill.root) continue;

			rows.set(skill.key, skill);
		}

		for (const skill of personal) {
			if (skill.root) continue;

			rows.set(skill.key, skill);
		}

		for (const skill of personal) {
			if (skill.root !== root) continue;

			rows.set(skill.key, skill);
		}

		return Array.from(rows.values()).sort(compareSkills);
	},
});

export const findSkill = defineQuery({
	args: z.object({
		key: skillKeySchema,
		owner: zid('users'),
		root: zid('files').optional(),
	}),
	handler: async (ctx, { key, owner, root }) => {
		//
		const userSkill = await findSkillByOwner(ctx, { key, owner, root });
		if (userSkill) return userSkill;

		const globalSkill = await findSkillByOwner(ctx, { key, owner: 'isPro' });
		if (globalSkill) return globalSkill;

		throw new Error(`Unknown skill: ${key}`);
	},
});

export const findSkillSafe = defineQuery({
	args: z.object({
		key: skillKeySchema,
		owner: zid('users'),
		root: zid('files').optional(),
	}),
	handler: async (ctx, { key, owner, root }) => {
		//
		try {
			return await findSkill(ctx, { key, owner, root });
		} catch (error) {
			if (error instanceof Error && error.message === `Unknown skill: ${key}`) {
				return undefined;
			}
			throw error;
		}
	},
});

function normalizeLegacySkill(skill: unknown) {
	//
	if (!skill || typeof skill !== 'object' || Array.isArray(skill)) return skill;
	if ('source' in skill) return skill;

	return {
		...skill,
		source: 'manual',
	};
}

function compareSkills(left: { priority?: number; key: string }, right: { priority?: number; key: string }) {
	//
	const priority = (left.priority ?? 999999999) - (right.priority ?? 999999999);
	if (priority !== 0) return priority;

	return left.key.localeCompare(right.key);
}
