import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import {
	actionDetailSchema,
	preparationActionDetailSchema,
	uploadActionDetailSchema,
} from 'schemas/actionDetailSchema';

export const findActionDetails = defineQuery({
	args: z.object({
		action: zid('actions'),
	}),
	handler: async (ctx, { action }) => {
		//
		return await ctx.db
			.query('action_details')
			.withIndex('by_action', (q) => q.eq('action', action))
			.collect();
	},
});

export const recordActionDetail = defineMutation({
	args: z.object({
		detail: actionDetailSchema,
	}),
	handler: async (ctx, { detail }) => {
		//
		return await ctx.db.insert('action_details', detail);
	},
});

export const recordActionPreparation = defineMutation({
	args: z.object({
		detail: preparationActionDetailSchema,
	}),
	handler: async (ctx, { detail }) => {
		//
		const details = await ctx.db
			.query('action_details')
			.withIndex('by_action', (q) => q.eq('action', detail.action))
			.collect();
		const existing = details.find((item) => item.kind === 'preparation');

		if (existing) {
			await ctx.db.patch(existing._id, detail);

			return existing._id;
		}

		return await ctx.db.insert('action_details', detail);
	},
});

export const findActionPreparation = defineQuery({
	args: z.object({
		action: zid('actions'),
	}),
	handler: async (ctx, { action }) => {
		//
		const details = await ctx.db
			.query('action_details')
			.withIndex('by_action', (q) => q.eq('action', action))
			.collect();
		const detail = details.find((item) => item.kind === 'preparation');
		if (!detail) throw new Error('Action is not prepared.');

		return preparationActionDetailSchema.parse(detail);
	},
});

export const findUploadTicket = defineQuery({
	args: z.object({
		action: zid('actions'),
	}),
	handler: async (ctx, { action }) => {
		//
		const details = await ctx.db
			.query('action_details')
			.withIndex('by_action', (q) => q.eq('action', action))
			.collect();
		const detail = details.find((item) => item.kind === 'upload');
		if (!detail) throw new Error('Upload ticket was not prepared.');

		return uploadActionDetailSchema.parse(detail);
	},
});
