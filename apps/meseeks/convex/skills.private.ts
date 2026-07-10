import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import { managedSkills } from 'lib/proDefinitions';
import { instinctSkills, referenceInstinctSkill } from 'lib/reactor/instincts';
import { authorSchema } from 'schemas/authorSchema';
import { intelligenceKeys } from 'schemas/intelligenceSchema';
import { requestHeaderSchema, skillInputArgumentSchema } from 'schemas/skillSchema';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { catFile, createFile, findChildByName, writeFileContent } from './files.private';
import { recordMutationAction } from './reactor.private';

const createSkillCoreArgsSchema = z.object({
	owner: zid('users'),
	key: z.string().min(1),
	name: z.string().min(1),
	description: z.string().default(''),
	input: z.array(skillInputArgumentSchema).optional(),
	file: zid('files'),
	isPublic: z.boolean().optional(),
	sourceOwner: zid('users').optional(),
	sourceKey: z.string().min(1).optional(),
	sourceFile: zid('files').optional(),
	author: authorSchema,
});

const createSkillArgsSchema = z.union([
	createSkillCoreArgsSchema.extend({
		kind: z.literal('think'),
		intelligence: z.union([z.literal('auto'), intelligenceKeys]).default('auto'),
		temperature: z.number().min(0).max(2).optional(),
		toolPolicy: z
			.object({
				skillKeys: z.array(z.string().min(1)).default([]),
				includeFileSkills: z.boolean().default(true),
			})
			.optional(),
	}),
	createSkillCoreArgsSchema.extend({
		kind: z.literal('request'),
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
		url: z.string().min(1),
		headers: z.array(requestHeaderSchema).default([]),
	}),
	createSkillCoreArgsSchema.extend({
		kind: z.literal('execute'),
		command: z.string().min(1),
		timeoutMs: z.number().int().positive().optional(),
		env: z.record(z.string()).optional(),
	}),
]);

export const findSkills = defineQuery({
	args: z.object({
		owner: zid('users'),
	}),
	handler: async (ctx, { owner }) => {
		//
		const ownerSkills = await ctx.db
			.query('skills')
			.withIndex('by_owner_key', (q) => q.eq('owner', owner))
			.collect();
		const proSkills = await publicProSkills(ctx, { owner });
		const keys = new Set(ownerSkills.map((skill) => skill.key));
		const visible = ownerSkills.slice();

		for (const skill of proSkills) {
			if (keys.has(skill.key)) continue;
			visible.push(skill);
		}

		return visible;
	},
});

export const findSkillById = defineQuery({
	args: z.object({
		owner: zid('users'),
		skill: zid('skills'),
	}),
	handler: async (ctx, { owner, skill }) => {
		//
		const row = await ctx.db.get(skill);
		if (!row || !isSkillVisibleToOwner({ skill: row, owner })) return undefined;

		return row;
	},
});

export const findSkillByFile = defineQuery({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
	}),
	handler: async (ctx, { owner, file }) => {
		//
		const row = await ctx.db
			.query('skills')
			.withIndex('by_file', (q) => q.eq('file', file))
			.unique();
		if (!row || !isSkillVisibleToOwner({ skill: row, owner })) return undefined;

		return row;
	},
});

export const findSkillByKey = defineQuery({
	args: z.object({
		owner: zid('users'),
		key: z.string().min(1),
	}),
	handler: async (ctx, { owner, key }) =>
		await ctx.db
			.query('skills')
			.withIndex('by_owner_key', (q) => q.eq('owner', owner).eq('key', key))
			.unique(),
});

export const findSkillWithBody = defineQuery({
	args: z.object({
		owner: zid('users'),
		skill: zid('skills'),
	}),
	handler: async (ctx, { owner, skill }) => {
		//
		const row = await findSkillById(ctx, { owner, skill });
		if (!row) return undefined;

		return await withBody(ctx, { skill: row });
	},
});

export const findSkillWithBodyByRouteId = defineQuery({
	args: z.object({
		owner: zid('users'),
		id: z.string().min(1),
	}),
	handler: async (ctx, { owner, id }) => {
		//
		const skillId = ctx.db.normalizeId('skills', id);
		if (skillId) {
			const row = await findSkillById(ctx, { owner, skill: skillId });
			if (row) return await withBody(ctx, { skill: row });
		}

		const fileId = ctx.db.normalizeId('files', id);
		if (!fileId) return undefined;

		const row = await findSkillByFile(ctx, { owner, file: fileId });
		if (!row) return undefined;

		return await withBody(ctx, { skill: row });
	},
});

export const resolveSkillForRuntime = defineQuery({
	args: z.object({
		owner: zid('users'),
		skillKey: z.string().min(1),
	}),
	handler: async (ctx, { owner, skillKey }) => {
		//
		const instinct = referenceInstinctSkill(skillKey);
		if (instinct) {
			return {
				key: instinct.key,
				name: instinct.name,
				description: instinct.description,
				kind: 'instinct',
				body: instinct.body,
			};
		}

		const row = await findSkillByKey(ctx, { owner, key: skillKey });
		if (row) return await withBody(ctx, { skill: row });

		const publicSkill = await publicProSkillByKey(ctx, { owner, key: skillKey });
		if (publicSkill) return await withBody(ctx, { skill: publicSkill });

		return undefined;
	},
});

export const seedManagedSkills = defineMutation({
	args: z.object({
		owner: zid('users'),
		author: authorSchema,
		parent: zid('files'),
	}),
	handler: async (ctx, { owner, author, parent }) => {
		//
		const existingSkillsDir = await findChildByName(ctx, {
			owner,
			parent,
			name: 'skills',
		});
		const skillsDirId =
			existingSkillsDir?._id ??
			(await createFile(ctx, {
				owner,
				parent,
				name: 'skills',
				author,
				tags: [{ key: 'kind', value: 'directory' }],
				shouldAddInboxTag: false,
			}));
		const skillIds: Id<'skills'>[] = [];

		for (const skill of managedSkills) {
			const fileId = await upsertManagedSkillFile(ctx, {
				owner,
				author,
				parent: skillsDirId,
				key: skill.key,
				body: skill.body,
			});
			const rowId = await upsertSkill(ctx, {
				owner,
				key: skill.key,
				name: skill.name,
				description: skill.description,
				kind: skill.kind,
				input: skill.input,
				file: fileId,
				intelligence: 'auto',
				isPublic: true,
				author,
			});
			skillIds.push(rowId);
		}

		return skillIds;
	},
});

export const createSkill = defineMutation({
	args: createSkillArgsSchema,
	handler: async (ctx, args) => await upsertSkill(ctx, args),
});

export const enableSkill = defineMutation({
	args: z.object({
		userId: zid('users'),
		skillKey: z.string().min(1),
	}),
	handler: async (ctx, { userId, skillKey }) => {
		//
		const existing = await findSkillByKey(ctx, { owner: userId, key: skillKey });
		if (existing) return existing._id;

		const file = await createFile(ctx, {
			owner: userId,
			name: `${skillKey}.skill.md`,
			author: userId,
			content: '',
			tags: [{ key: 'kind', value: 'skill-source' }],
			shouldAddInboxTag: false,
		});

		return await upsertSkill(ctx, {
			owner: userId,
			key: skillKey,
			name: skillKey,
			description: '',
			kind: 'think',
			file,
			intelligence: 'auto',
			author: userId,
		});
	},
});

async function upsertManagedSkillFile(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		author: z.infer<typeof authorSchema>;
		parent: Id<'files'>;
		key: string;
		body: string;
	},
) {
	//
	const name = `${args.key}.skill.md`;
	const existing = await findChildByName(ctx, {
		owner: args.owner,
		parent: args.parent,
		name,
	});

	if (existing) {
		if (existing.isPublic !== true) {
			await ctx.db.patch(existing._id, {
				isPublic: true,
				updatedAt: Date.now(),
			});
		}
		const previous = await catFile(ctx, { fileId: existing._id, owner: args.owner });
		if (previous !== args.body) {
			await writeFileContent(ctx, {
				owner: args.owner,
				fileId: existing._id,
				author: args.author,
				content: args.body,
			});
		}

		return existing._id;
	}

	return await createFile(ctx, {
		owner: args.owner,
		parent: args.parent,
		name,
		author: args.author,
		content: args.body,
		isPublic: true,
		tags: [{ key: 'kind', value: 'skill-source' }],
		shouldAddInboxTag: false,
	});
}

async function upsertSkill(ctx: MutationCtx, args: z.infer<typeof createSkillArgsSchema>) {
	//
	const now = Date.now();
	const existing = await findSkillByKey(ctx, { owner: args.owner, key: args.key });
	const value = skillRowValue(args, now);

	if (existing) {
		await ctx.db.patch(existing._id, value);
		await recordMutationAction(ctx, {
			owner: args.owner,
			file: args.file,
			author: args.author,
			skillKey: 'updateSkill',
			args: {
				skill: existing._id,
				key: args.key,
			},
			result: {
				text: `Updated skill ${args.key}.`,
				files: [
					{
						file: args.file,
						path: args.name,
					},
				],
			},
		});
		return existing._id;
	}

	const skillId = await ctx.db.insert('skills', {
		...value,
		createdAt: now,
	});
	await recordMutationAction(ctx, {
		owner: args.owner,
		file: args.file,
		author: args.author,
		skillKey: 'createSkill',
		args: {
			skill: skillId,
			key: args.key,
		},
		result: {
			text: `Created skill ${args.key}.`,
			files: [
				{
					file: args.file,
					path: args.name,
				},
			],
		},
	});

	return skillId;
}

function skillRowValue(args: z.infer<typeof createSkillArgsSchema>, updatedAt: number) {
	//
	const core = {
		owner: args.owner,
		key: args.key,
		name: args.name,
		description: args.description,
		input: args.input,
		file: args.file,
		isPublic: args.isPublic,
		sourceOwner: args.sourceOwner,
		sourceKey: args.sourceKey,
		sourceFile: args.sourceFile,
		author: args.author,
		updatedAt,
	};

	if (args.kind === 'think') {
		return {
			...core,
			kind: args.kind,
			intelligence: args.intelligence,
			temperature: args.temperature,
			toolPolicy: args.toolPolicy,
		};
	}

	if (args.kind === 'request') {
		return {
			...core,
			kind: args.kind,
			method: args.method,
			url: args.url,
			headers: args.headers,
		};
	}

	return {
		...core,
		kind: args.kind,
		command: args.command,
		timeoutMs: args.timeoutMs,
		env: args.env,
	};
}

export function listInstinctSkills() {
	//
	return instinctSkills.map((skill) => ({
		key: skill.key,
		name: skill.name,
		description: skill.description,
		kind: 'instinct',
		input: skill.input,
		body: skill.body,
	}));
}

async function publicProSkills(ctx: QueryCtx, args: { owner: Id<'users'> }) {
	//
	const skills = await ctx.db
		.query('skills')
		.withIndex('by_public_key', (q) => q.eq('isPublic', true))
		.collect();

	return dedupePublicSkills(skills).filter((skill) => skill.owner !== args.owner);
}

async function publicProSkillByKey(ctx: QueryCtx, args: { owner: Id<'users'>; key: string }) {
	//
	const skills = await ctx.db
		.query('skills')
		.withIndex('by_public_key', (q) => q.eq('isPublic', true).eq('key', args.key))
		.collect();

	return dedupePublicSkills(skills).find((skill) => skill.owner !== args.owner);
}

function isSkillVisibleToOwner(args: { skill: Doc<'skills'>; owner: Id<'users'> }) {
	//
	if (args.skill.owner === args.owner) return true;

	return args.skill.isPublic === true;
}

function dedupePublicSkills(skills: Doc<'skills'>[]) {
	//
	const byKey = new Map<string, Doc<'skills'>>();
	const ordered = skills
		.slice()
		.sort((left, right) => right.updatedAt - left.updatedAt || right._creationTime - left._creationTime);

	for (const skill of ordered) {
		if (byKey.has(skill.key)) continue;
		byKey.set(skill.key, skill);
	}

	return Array.from(byKey.values());
}

async function withBody(ctx: QueryCtx, args: { skill: Doc<'skills'> }) {
	//
	const file = await ctx.db.get(args.skill.file);

	return {
		...args.skill,
		fileName: file?.name,
		input: args.skill.input ?? [],
		body: await catFile(ctx, { fileId: args.skill.file, owner: args.skill.owner }),
	};
}
