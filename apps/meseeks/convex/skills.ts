import { z } from 'zod/v3';
import { mutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { referenceInstinctSkill } from 'lib/reactor/instincts';
import { skillInputArgumentSchema, storedSkillKindSchema } from 'schemas/skillSchema';
import { createFile } from './files.private';
import { createSkill, findSkillWithBodyByRouteId, findSkills, listInstinctSkills } from './skills.private';
import { getCurrentUser } from './users.private';

export const findAll = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return {
			instincts: listInstinctSkills(),
			skills: await findSkills(ctx, { owner: currentUser._id }),
		};
	},
});

export const findOne = query({
	args: {
		id: z.string().min(1),
	},
	handler: async (ctx, { id }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const row = await findSkillWithBodyByRouteId(ctx, { owner: currentUser._id, id });
		if (!row) throw NotFound();

		return row;
	},
});

export const findInstinct = query({
	args: {
		key: z.string().min(1),
	},
	handler: async (ctx, { key }) => {
		//
		await getCurrentUser(ctx, {});
		const instinct = referenceInstinctSkill(key);
		if (!instinct) throw NotFound();

		return instinct;
	},
});

export const create = mutation({
	args: {
		key: z.string().min(1),
		name: z.string().min(1),
		description: z.string().default(''),
		kind: storedSkillKindSchema.default('soft'),
		input: z.array(skillInputArgumentSchema).default([]),
		body: z.string().default(''),
	},
	handler: async (ctx, { key, name, description, kind, input, body }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const file = await createFile(ctx, {
			owner: currentUser._id,
			name: `${key}.skill.md`,
			author: currentUser._id,
			content: body,
			tags: [{ key: 'kind', value: 'skill-source' }],
			shouldAddInboxTag: false,
		});

		return await createSkill(ctx, {
			owner: currentUser._id,
			key,
			name,
			description,
			kind,
			input,
			file,
			author: currentUser._id,
		});
	},
});
