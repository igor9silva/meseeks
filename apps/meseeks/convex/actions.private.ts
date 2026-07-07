import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Id } from 'convex/_generated/dataModel';
import type { MutationCtx } from 'convex/_generated/server';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { actionSkillSchema, actionSparkSchema } from 'schemas/actionSchema';
import { authorSchema } from 'schemas/authorSchema';
import { intelligenceKeys } from 'schemas/intelligenceSchema';

export const findAction = defineQuery({
	args: z.object({
		action: zid('actions'),
	}),
	handler: async (ctx, { action }) => {
		//
		const row = await ctx.db.get(action);
		if (!row) throw NotFound();

		return row;
	},
});

export const enqueueAction = defineMutation({
	args: z.object({
		owner: zid('users'),
		author: authorSchema,
		spark: actionSparkSchema,
		root: zid('files'),
		skill: actionSkillSchema,
		intelligence: intelligenceKeys.optional(),
		input: z.record(z.unknown()),
	}),
	handler: async (ctx, args) => {
		//
		const index = await nextIndex(ctx, { root: args.root });
		if (args.spark === 'self' && args.author !== args.owner) throw new Error('Reaction actions require spark.');

		return await ctx.db.insert('actions', {
			owner: args.owner,
			root: args.root,
			index,
			author: args.author,
			spark: args.spark,
			skill: args.skill,
			intelligence: args.intelligence,
			input: args.input,
			status: 'enqueued',
		});
	},
});

async function nextIndex(ctx: MutationCtx, { root }: { root: Id<'files'> }) {
	//
	const last = await ctx.db
		.query('actions')
		.withIndex('by_root_index', (q) => q.eq('root', root))
		.order('desc')
		.first();

	return (last?.index ?? 0) + 1;
}
