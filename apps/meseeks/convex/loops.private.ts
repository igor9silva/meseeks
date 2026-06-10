import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { intelligences, managedLoops, recommendedIntelligences } from 'lib/proDefinitions';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { authorSchema } from 'schemas/authorSchema';
import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { recordMutationAction } from './reactor.private';

export const seedManagedLoops = defineMutation({
	args: z.object({
		owner: zid('users'),
		author: authorSchema,
		auditFile: zid('files'),
	}),
	handler: async (ctx, { owner, author, auditFile }) => {
		//
		const loopIds: Id<'loops'>[] = [];

		for (const loop of managedLoops) {
			const visual = loop.visual ?? {
				icon: 'circle',
				color: 'neutral',
				tint: 'neutral',
			};
			const existing = await ctx.db
				.query('loops')
				.withIndex('by_owner_key', (q) => q.eq('owner', owner).eq('key', loop.key))
				.unique();

			if (existing) {
				if (
					existing.name === loop.name &&
					existing.isPublic === true &&
					existing.defaultIntelligenceKey === loop.defaultIntelligenceKey &&
					areJsonRecordsEqual(existing.visual, visual)
				) {
					loopIds.push(existing._id);
					continue;
				}

				await ctx.db.patch(existing._id, {
					name: loop.name,
					description: loop.description,
					isPublic: true,
					defaultIntelligenceKey: loop.defaultIntelligenceKey,
					visual,
					updatedAt: Date.now(),
				});
				await recordMutationAction(ctx, {
					owner,
					file: auditFile,
					author,
					skillKey: 'updateLoop',
					args: {
						key: loop.key,
					},
					result: {
						text: `Updated loop ${loop.key}.`,
						files: [],
					},
				});
				loopIds.push(existing._id);
				continue;
			}

			const loopId = await ctx.db.insert('loops', {
				owner,
				key: loop.key,
				name: loop.name,
				description: loop.description,
				isPublic: true,
				defaultIntelligenceKey: loop.defaultIntelligenceKey,
				visual,
				author,
				createdAt: Date.now(),
				updatedAt: Date.now(),
			});
			await recordMutationAction(ctx, {
				owner,
				file: auditFile,
				author,
				skillKey: 'createLoop',
				args: {
					key: loop.key,
				},
				result: {
					text: `Created loop ${loop.key}.`,
					files: [],
				},
			});
			loopIds.push(loopId);
		}

		return loopIds;
	},
});

export const createLoop = defineMutation({
	args: z.object({
		owner: zid('users'),
		key: z.string().min(1),
		name: z.string().min(1),
		description: z.string().default(''),
		defaultIntelligenceKey: z.string().min(1).optional(),
		visual: z
			.object({
				icon: z.string().min(1),
				color: z.string().min(1),
				tint: z.string().min(1),
			})
			.default({
				icon: 'circle',
				color: 'zinc',
				tint: 'zinc',
			}),
		author: authorSchema,
		auditFile: zid('files'),
	}),
	handler: async (ctx, { owner, key, name, description, defaultIntelligenceKey, visual, author, auditFile }) => {
		//
		const existing = await ctx.db
			.query('loops')
			.withIndex('by_owner_key', (q) => q.eq('owner', owner).eq('key', key))
			.unique();
		if (existing) throw new Error('A loop with this key already exists.');

		const now = Date.now();
		const loopId = await ctx.db.insert('loops', {
			owner,
			key,
			name,
			description,
			defaultIntelligenceKey,
			visual,
			author,
			createdAt: now,
			updatedAt: now,
		});
		const actionId = await recordMutationAction(ctx, {
			owner,
			file: auditFile,
			author,
			skillKey: 'createLoop',
			args: {
				key,
			},
			result: {
				text: `Created loop ${key}.`,
				files: [],
			},
		});

		return {
			loopId,
			actionId,
		};
	},
});

function areJsonRecordsEqual(left: unknown, right: unknown) {
	//
	return JSON.stringify(left) === JSON.stringify(right);
}

export const findLoopByKey = defineQuery({
	args: z.object({
		owner: zid('users'),
		key: z.string().min(1),
	}),
	handler: async (ctx, { owner, key }) => {
		//
		const owned = await ctx.db
			.query('loops')
			.withIndex('by_owner_key', (q) => q.eq('owner', owner).eq('key', key))
			.unique();
		if (owned) return owned;

		return await publicProLoopByKey(ctx, { owner, key });
	},
});

export const listLoops = defineQuery({
	args: z.object({
		owner: zid('users'),
	}),
	handler: async (ctx, { owner }) => {
		//
		const owned = await ctx.db
			.query('loops')
			.withIndex('by_owner_key', (q) => q.eq('owner', owner))
			.collect();
		const proLoops = await publicProLoops(ctx, { owner });
		const keys = new Set(owned.map((loop) => loop.key));
		const visible = owned.slice();

		for (const loop of proLoops) {
			if (keys.has(loop.key)) continue;
			visible.push(loop);
		}

		return visible;
	},
});

export const findIntelligenceOptions = defineQuery({
	args: z.object({}),
	handler: async () => ({
		recommended: recommendedIntelligences,
		intelligences,
	}),
});

export const resolveLoop = defineQuery({
	args: z.object({
		owner: zid('users'),
		loop: zid('loops').optional(),
		loopKey: z.string().min(1).nullable().optional(),
	}),
	handler: async (ctx, { owner, loop, loopKey }) => {
		//
		if (loop) {
			const record = await ctx.db.get(loop);
			if (!record || !isLoopVisibleToOwner({ loop: record, owner })) throw NotFound();
			return record;
		}

		if (!loopKey) return undefined;

		return await findLoopByKey(ctx, { owner, key: loopKey });
	},
});

async function publicProLoops(ctx: QueryCtx, args: { owner: Id<'users'> }): Promise<Doc<'loops'>[]> {
	//
	const loops = await ctx.db
		.query('loops')
		.withIndex('by_public_key', (q) => q.eq('isPublic', true))
		.collect();

	return dedupePublicLoops(loops).filter((loop) => loop.owner !== args.owner);
}

async function publicProLoopByKey(
	ctx: QueryCtx,
	args: { owner: Id<'users'>; key: string },
): Promise<Doc<'loops'> | null> {
	//
	const loops = await ctx.db
		.query('loops')
		.withIndex('by_public_key', (q) => q.eq('isPublic', true).eq('key', args.key))
		.collect();

	return dedupePublicLoops(loops).find((loop) => loop.owner !== args.owner) ?? null;
}

export function isLoopVisibleToOwner(args: { loop: Doc<'loops'>; owner: Id<'users'> }) {
	//
	if (args.loop.owner === args.owner) return true;

	return args.loop.isPublic === true;
}

function dedupePublicLoops(loops: Doc<'loops'>[]) {
	//
	const byKey = new Map<string, Doc<'loops'>>();
	const ordered = loops
		.slice()
		.sort((left, right) => right.updatedAt - left.updatedAt || right._creationTime - left._creationTime);

	for (const loop of ordered) {
		if (byKey.has(loop.key)) continue;
		byKey.set(loop.key, loop);
	}

	return Array.from(byKey.values());
}
