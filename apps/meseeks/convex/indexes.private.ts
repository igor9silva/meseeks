import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import { indexSchema } from 'schemas/indexSchema';

export const findIndexesForFile = defineQuery({
	args: z.object({
		file: zid('files'),
	}),
	handler: async (ctx, { file }) => {
		//
		return await ctx.db
			.query('indexes')
			.withIndex('by_file_kind', (q) => q.eq('file', file))
			.collect();
	},
});

export const findReadyIndexesByKind = defineQuery({
	args: z.object({
		owner: zid('users'),
		kind: indexSchema.shape.kind,
	}),
	handler: async (ctx, { owner, kind }) => {
		//
		return await ctx.db
			.query('indexes')
			.withIndex('by_owner_kind_status', (q) =>
				q
					.eq('owner', owner) //
					.eq('kind', kind)
					.eq('status', 'ready'),
			)
			.collect();
	},
});

export const upsertIndex = defineMutation({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
		kind: indexSchema.shape.kind,
		status: indexSchema.shape.status,
		data: z.record(z.unknown()).optional(),
		storageKey: z.string().min(1).optional(),
	}),
	handler: async (ctx, { owner, file, kind, status, data, storageKey }) => {
		//
		const now = Date.now();
		const existing = await ctx.db
			.query('indexes')
			.withIndex('by_file_kind', (q) =>
				q
					.eq('file', file) //
					.eq('kind', kind),
			)
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				owner,
				status,
				data,
				storageKey,
				updatedAt: now,
			});
			return existing._id;
		}

		return await ctx.db.insert('indexes', {
			owner,
			file,
			kind,
			status,
			data,
			storageKey,
			updatedAt: now,
		});
	},
});

export const markIndexesStale = defineMutation({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
	}),
	handler: async (ctx, { owner, file }) => {
		//
		const indexes = await ctx.db
			.query('indexes')
			.withIndex('by_owner_file', (q) =>
				q
					.eq('owner', owner) //
					.eq('file', file),
			)
			.collect();

		for (const index of indexes) {
			if (index.status === 'stale') continue;
			await ctx.db.patch(index._id, {
				status: 'stale',
				updatedAt: Date.now(),
			});
		}

		return indexes.length;
	},
});
