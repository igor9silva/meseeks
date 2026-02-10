import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { Doc, Id } from './_generated/dataModel';
import { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, internalQuery, mutation, query } from './lib';
import { NotFound } from './lib/errors';
import { asBigInt } from './lib/money';
import { intelligenceKeys } from './schemas/intelligenceSchema';
import { paginationOptionsSchema } from './schemas/paginationOptionsSchema';
import {
	add as addTask,
	addAvailableSkill,
	addWithActions,
	findActiveTasks,
	findOne as findTask,
	increaseBudget,
	markAsRead as markTaskAsRead,
	move,
	removeFunds,
	setPreferredIntelligence as setTaskPreferredIntelligence,
	setStatus,
	updateInstructions,
	useFunds,
} from './tasks.private';
import { current } from './users.private';

export const _findOne = internalQuery({
	args: findTask.args.shape,
	handler: async (ctx, args) => {
		//
		return await findTask(ctx, args);
	},
});

export const _findActiveTasks = internalQuery({
	args: findActiveTasks.args.shape,
	handler: async (ctx, args) => {
		//
		return await findActiveTasks(ctx, args);
	},
});

export const _add = internalMutation({
	args: addTask.args.shape,
	handler: async (ctx, args) => {
		//
		return await addTask(ctx, args);
	},
});

export const _addWithActions = internalMutation({
	args: addWithActions.args.shape,
	handler: async (ctx, args) => {
		//
		return await addWithActions(ctx, args);
	},
});

export const _updateInstructions = internalMutation({
	args: updateInstructions.args.shape,
	handler: async (ctx, args) => {
		//
		return await updateInstructions(ctx, args);
	},
});

export const _addAvailableSkill = internalMutation({
	args: addAvailableSkill.args.shape,
	handler: async (ctx, args) => {
		//
		await addAvailableSkill(ctx, args);
	},
});

export const _markAsRead = internalMutation({
	args: markTaskAsRead.args.shape,
	handler: async (ctx, args) => {
		//
		await markTaskAsRead(ctx, args);
	},
});

export const _setStatus = internalMutation({
	args: setStatus.args.shape,
	handler: async (ctx, args) => {
		//
		await setStatus(ctx, args);
	},
});

export const _useFunds = internalMutation({
	args: useFunds.args.shape,
	handler: async (ctx, args) => {
		//
		await useFunds(ctx, args);
	},
});

export const _increaseBudget = internalMutation({
	args: increaseBudget.args.shape,
	handler: async (ctx, args) => {
		//
		await increaseBudget(ctx, args);
	},
});

export const _removeFunds = internalMutation({
	args: removeFunds.args.shape,
	handler: async (ctx, args) => {
		//
		await removeFunds(ctx, args);
	},
});

export const _move = internalMutation({
	args: move.args.shape,
	handler: async (ctx, args) => {
		//
		await move(ctx, args);
	},
});

export const _setPreferredIntelligence = internalMutation({
	args: setTaskPreferredIntelligence.args.shape,
	handler: async (ctx, args) => {
		//
		await setTaskPreferredIntelligence(ctx, args);
	},
});

export const findAll = query({
	args: {
		parentId: zid('tasks').optional(),
	},
	handler: async (ctx, { parentId }) => {
		//
		if (!parentId) {
			const currentUser = await current(ctx, {});
			return await findAllAtInboxByOwner(ctx, { owner: currentUser._id });
		}

		await ensureTaskOwner(ctx, { taskId: parentId });

		const find = ({ isActive }: { isActive: boolean }) =>
			ctx.db
				.query('tasks')
				.withIndex('by_parent_isActive', (q) =>
					q
						.eq('parentId', parentId) //
						.eq('isActive', isActive),
				)
				.order('desc')
				.collect();

		const [active, inactive] = await Promise.all([
			find({ isActive: true }), //
			find({ isActive: false }),
		]);

		return active.concat(inactive);
	},
});

// sorted by available budget (descending, highest first)
export const findAllPaginated = query({
	args: {
		paginationOpts: paginationOptionsSchema,
	},
	handler: async (ctx, { paginationOpts }) => {
		//
		const currentUser = await current(ctx, {});

		return await ctx.db
			.query('tasks')
			.withIndex('by_owner_energyAvailable', (q) => q.eq('owner', currentUser._id))
			.order('desc')
			.paginate(paginationOpts);
	},
});

export const findAllAtInbox = query({
	args: {},
	handler: async (ctx) => {
		//
		const currentUser = await current(ctx, {});

		return await findAllAtInboxByOwner(ctx, { owner: currentUser._id });
	},
});

// Paginated version of findAllAtInbox that maintains the same sorting logic
export const findAllAtInboxPaginated = query({
	args: {
		paginationOpts: paginationOptionsSchema,
	},
	handler: async (ctx, { paginationOpts }) => {
		//
		const currentUser = await current(ctx, {});

		// Use a single query with compound sorting
		// First sort by isActive (false first, so inactive tasks come after active ones when reversed)
		// Then sort by a computed priority based on status
		const results = await ctx.db
			.query('tasks')
			.withIndex('by_owner_parentId_isActive', (q) => q.eq('owner', currentUser._id).eq('parentId', undefined))
			.order('desc') // This will be overridden by our custom sorting
			.paginate(paginationOpts);

		return results;
	},
});

export const findOne = query({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		await ensureTaskOwner(ctx, { taskId });
		return await findTask(ctx, { taskId });
	},
});

export const findOneOrNot = query({
	args: {
		taskId: zid('tasks').optional(),
	},
	handler: async (ctx, { taskId }) => {
		//
		if (!taskId) return undefined;

		await ensureTaskOwner(ctx, { taskId });
		return await findTask(ctx, { taskId });
	},
});

export const add = mutation({
	args: {
		message: z.string().optional(),
		parentId: zid('tasks').optional(),
		preferredIntelligence: intelligenceKeys.optional(),
		initialFunds: z
			.bigint()
			.min(0n)
			.max(asBigInt({ dollars: 100000 })),
	},
	handler: async (ctx, { message, parentId, initialFunds, preferredIntelligence }) => {
		//
		const currentUser = await current(ctx, {});
		return await addTask(ctx, {
			author: currentUser._id,
			owner: currentUser._id,
			parentId,
			message,
			preferredIntelligence,
			initialFunds,
		});
	},
});

export const markAsRead = mutation({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		await ensureTaskOwner(ctx, { taskId });
		await markTaskAsRead(ctx, { taskId });
	},
});

export const setPreferredIntelligence = mutation({
	args: {
		taskId: zid('tasks'),
		preferredIntelligence: intelligenceKeys,
	},
	handler: async (ctx, { taskId, preferredIntelligence }) => {
		//
		await ensureTaskOwner(ctx, { taskId });
		return await setTaskPreferredIntelligence(ctx, { taskId, preferredIntelligence });
	},
});

const findAllAtInboxByOwner = async (
	ctx: QueryCtx,
	{
		owner,
	}: {
		owner: Id<'users'>;
	},
) => {
	//
	const find = ({ isActive }: { isActive: boolean }) =>
		ctx.db
			.query('tasks')
			.withIndex('by_owner_parentId_isActive', (q) =>
				q
					.eq('owner', owner) //
					.eq('parentId', undefined)
					.eq('isActive', isActive),
			)
			.order('desc')
			.collect();

	const [active, inactive] = await Promise.all([
		find({ isActive: true }), //
		find({ isActive: false }),
	]);

	return active.concat(inactive);
};

export const ensureTaskOwner = async (
	ctx: QueryCtx | MutationCtx, //
	args: {
		taskId: Id<'tasks'>;
	},
): Promise<{
	currentUser: { _id: Id<'users'> };
	task: Doc<'tasks'>;
}> => {
	//
	const currentUser = await current(ctx, {});
	const task = await ctx.db.get(args.taskId);

	if (!task) throw NotFound();
	if (task.owner !== currentUser._id) throw NotFound(); // purposefully do not mention authorization

	return { currentUser, task };
};
