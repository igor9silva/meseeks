import { z } from 'zod/v3';
import { internalMutation } from 'lib/convex';
import type { MutationCtx } from './_generated/server';

const isPro = 'isPro';

const defaultComponents = [
	{
		slug: 'list',
		body: '<Inbox />',
	},
	{
		slug: 'task',
		body: '<Task />',
	},
	{
		slug: 'new',
		body: '<QuickSeek />',
	},
];

export const _all = internalMutation({
	args: z.object({}),
	handler: async (ctx) => {
		//
		return await seedComponents(ctx);
	},
});

async function seedComponents(ctx: MutationCtx) {
	//
	let inserted = 0;
	let updated = 0;

	for (const component of defaultComponents) {
		//
		const existing = await ctx.db
			.query('components')
			.withIndex('by_owner_slug', (q) => q.eq('owner', isPro).eq('slug', component.slug))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, { body: component.body, isPublic: false });
			updated += 1;
			continue;
		}

		await ctx.db.insert('components', {
			owner: isPro,
			slug: component.slug,
			body: component.body,
			isPublic: false,
		});

		inserted += 1;
	}

	return { inserted, updated };
}
