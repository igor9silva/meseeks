import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { latestActionForFile } from './reactor.private';

export const findReadCursor = defineQuery({
	args: z.object({
		user: zid('users'),
		file: zid('files'),
	}),
	handler: async (ctx, { user, file }) => {
		//
		return await ctx.db
			.query('reads')
			.withIndex('by_user_file', (q) =>
				q
					.eq('user', user) //
					.eq('file', file),
			)
			.unique();
	},
});

export const markFileRead = defineMutation({
	args: z.object({
		user: zid('users'),
		file: zid('files'),
		lastReadActionIndex: z.number().int().nonnegative(),
	}),
	handler: async (ctx, { user, file, lastReadActionIndex }) => {
		//
		const now = Date.now();
		const existing = await findReadCursor(ctx, { user, file });

		if (existing) {
			await ctx.db.patch(existing._id, {
				lastReadActionIndex,
				lastReadAt: now,
			});
			return existing._id;
		}

		return await ctx.db.insert('reads', {
			user,
			file,
			lastReadActionIndex,
			lastReadAt: now,
		});
	},
});

export async function deriveReadState(
	ctx: MutationCtx | QueryCtx,
	args: {
		user: Id<'users'>;
		file: Id<'files'>;
	},
) {
	//
	const latestAction = await latestActionForFile(ctx, { file: args.file });
	const cursor = await findReadCursor(ctx, {
		user: args.user,
		file: args.file,
	});
	const latestActionIndex = latestAction?.index ?? -1;
	const lastReadActionIndex = cursor?.lastReadActionIndex ?? -1;

	return {
		cursor,
		latestActionIndex,
		lastReadActionIndex,
		isUnread: latestActionIndex > lastReadActionIndex,
	};
}
//
