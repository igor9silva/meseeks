import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internalMutation, internalQuery, mutation, query } from 'lib/convex';
import { asBigInt } from 'lib/money';
import { intelligenceKeys } from 'schemas/intelligenceSchema';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import {
	addTask,
	addTaskAvailableSkill,
	ensureTaskOwner,
	findActiveTasks,
	findAllAtInboxByOwner,
	findTask,
	increaseTaskBudget,
	markTaskAsRead,
	moveTask,
	removeTaskFunds,
	setTaskPreferredIntelligence,
	setTaskStatus,
	updateTaskInstructions,
} from './tasks.private';
import { getCurrentUser } from './users.private';

// used by magicRock.private.ts to expand {{activeTasks}} inside generated system instructions
export const _findActiveTasks = internalQuery({
	args: findActiveTasks.args.shape,
	handler: findActiveTasks,
});

// called by skills/builtIn/updateInstructions.ts so the ai can patch title/instructions/summary/available skills
export const _updateInstructions = internalMutation({
	args: updateTaskInstructions.args.shape,
	handler: updateTaskInstructions,
});

// called by skills/builtIn/createSkill.ts and skills/builtIn/updateSkill.ts to append newly enabled skills to a task
export const _addAvailableSkill = internalMutation({
	args: addTaskAvailableSkill.args.shape,
	handler: addTaskAvailableSkill,
});

// called by builtIn skills resolve/discard/reopen to drive task lifecycle transitions
export const _setStatus = internalMutation({
	args: setTaskStatus.args.shape,
	handler: setTaskStatus,
});

// called by skills/builtIn/increaseBudget.ts so the ai can fund a task from account balance
export const _increaseBudget = internalMutation({
	args: increaseTaskBudget.args.shape,
	handler: increaseTaskBudget,
});

// called by skills/builtIn/decreaseBudget.ts to refund unused task budget back to account balance
export const _removeFunds = internalMutation({
	args: removeTaskFunds.args.shape,
	handler: removeTaskFunds,
});

// called by skills/builtIn/moveTask.ts so the ai can move a task to another parent or inbox
export const _move = internalMutation({
	args: moveTask.args.shape,
	handler: moveTask,
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

// paginated task list query for inbox roots or one parent's children
export const findAllAtInboxPaginated = query({
	args: {
		parentId: zid('tasks').optional(),
		paginationOpts: paginationOptionsSchema,
	},
	handler: async (ctx, { parentId, paginationOpts }) => {
		//
		if (parentId) {
			await ensureTaskOwner(ctx, { taskId: parentId });

			return await ctx.db
				.query('tasks')
				.withIndex('by_parent_isActive', (q) => q.eq('parentId', parentId))
				.order('desc')
				.paginate(paginationOpts);
		}

		const currentUser = await getCurrentUser(ctx, {});

		// inbox roots are keyed by owner + missing parent; the hook applies ui ordering
		const results = await ctx.db
			.query('tasks')
			.withIndex('by_owner_parentId_isActive', (q) => q.eq('owner', currentUser._id).eq('parentId', undefined))
			.order('desc')
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
