import { z } from 'zod/v3';
import { mutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { referenceInstinctSkill } from 'lib/reactor/instincts';
import { requestHeaderSchema, skillInputArgumentSchema, storedSkillKindSchema } from 'schemas/skillSchema';
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
		kind: storedSkillKindSchema.default('think'),
		input: z.array(skillInputArgumentSchema).default([]),
		body: z.string().default(''),
		method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
		url: z.string().min(1).optional(),
		headers: z.array(requestHeaderSchema).default([]),
		command: z.string().min(1).optional(),
		timeoutMs: z.number().int().positive().optional(),
		env: z.record(z.string()).optional(),
	},
	handler: async (
		ctx,
		{ key, name, description, kind, input, body, method, url, headers, command, timeoutMs, env },
	) => {
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

		if (kind === 'request') {
			if (!method || !url) throw new Error('Request skills require method and URL.');
			return await createSkill(ctx, {
				owner: currentUser._id,
				key,
				name,
				description,
				kind,
				input,
				file,
				method,
				url,
				headers,
				author: currentUser._id,
			});
		}

		if (kind === 'execute') {
			if (!command) throw new Error('Execute skills require a command.');
			return await createSkill(ctx, {
				owner: currentUser._id,
				key,
				name,
				description,
				kind,
				input,
				file,
				command,
				timeoutMs,
				env,
				author: currentUser._id,
			});
		}

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
