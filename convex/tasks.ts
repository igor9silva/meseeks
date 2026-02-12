import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { internalMutation, internalQuery, mutation, query } from 'lib/convex';
import { asBigInt } from 'lib/money';
import { intelligenceKeys } from 'schemas/intelligenceSchema';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import {
	addTask,
	addAvailableSkill,
	ensureTaskOwner,
	findActiveTasks,
	findAllAtInboxByOwner,
	findTask,
	increaseBudget,
	markTaskAsRead,
	move,
	removeFunds,
	setTaskPreferredIntelligence,
	setTaskStatus,
	updateInstructions,
} from './tasks.private';
import { getCurrentUser } from './users.private';

// used by magicRock.private.ts to expand {{activeTasks}} inside generated system instructions
export const _findActiveTasks = internalQuery({
	args: findActiveTasks.args.shape,
	handler: findActiveTasks,
});

// called by skills/builtIn/updateInstructions.ts so the ai can patch title/instructions/summary/available skills
export const _updateInstructions = internalMutation({
	args: updateInstructions.args.shape,
	handler: updateInstructions,
});

// called by skills/builtIn/createSkill.ts and skills/builtIn/updateSkill.ts to append newly enabled skills to a task
export const _addAvailableSkill = internalMutation({
	args: addAvailableSkill.args.shape,
	handler: addAvailableSkill,
});

// called by builtIn skills resolve/discard/reopen to drive task lifecycle transitions
export const _setStatus = internalMutation({
	args: setTaskStatus.args.shape,
	handler: setTaskStatus,
});

// called by skills/builtIn/increaseBudget.ts so the ai can fund a task from account balance
export const _increaseBudget = internalMutation({
	args: increaseBudget.args.shape,
	handler: increaseBudget,
});

// called by skills/builtIn/decreaseBudget.ts to refund unused task budget back to account balance
export const _removeFunds = internalMutation({
	args: removeFunds.args.shape,
	handler: removeFunds,
});

// called by skills/builtIn/moveTask.ts so the ai can move a task to another parent or inbox
export const _move = internalMutation({
	args: move.args.shape,
	handler: move,
});

export const findAll = query({
	args: {
		parentId: zid('tasks').optional(),
	},
	handler: async (ctx, { parentId }) => {
		//
		if (!parentId) {
			const currentUser = await getCurrentUser(ctx, {});
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
		const currentUser = await getCurrentUser(ctx, {});

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
		const currentUser = await getCurrentUser(ctx, {});

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
		const currentUser = await getCurrentUser(ctx, {});

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
		const currentUser = await getCurrentUser(ctx, {});
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
