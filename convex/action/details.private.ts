import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { defineMutation, defineQuery } from '../lib';
import { NotFound } from '../lib/errors';
import { actionDetailSchema, actionDetailUpdateSchema } from '../schemas/actionDetailSchema';

export const persist = defineMutation({
	args: z.object({
		details: actionDetailSchema,
	}),
	handler: async (ctx, { details }) => {
		//
		const existing = await findByAction(ctx, { actionId: details.actionId });
		if (existing) throw new Error('Action detail already exists');

		return await ctx.db.insert('action_details', details);
	},
});

export const update = defineMutation({
	args: z.object({
		actionId: zid('actions'),
		updates: actionDetailUpdateSchema,
	}),
	handler: async (ctx, { actionId, updates }) => {
		//
		const existing = await findByAction(ctx, { actionId });
		if (!existing) throw NotFound();

		// Merge updates with existing data to maintain complete object structure
		if ('llm' in updates && 'llm' in existing) {
			const updatedLlm = { ...existing.llm, ...updates.llm };
			return await ctx.db.patch(existing._id, { llm: updatedLlm });
		}

		if ('http' in updates && 'http' in existing) {
			const updatedHttp = { ...existing.http, ...updates.http };
			return await ctx.db.patch(existing._id, { http: updatedHttp });
		}

		throw new Error('Update type does not match existing document type');
	},
});

export const findByAction = defineQuery({
	args: z.object({
		actionId: zid('actions'),
	}),
	handler: async (ctx, { actionId }) => {
		//
		return await ctx.db
			.query('action_details')
			.withIndex('by_action', (q) => q.eq('actionId', actionId))
			.unique();
	},
});
