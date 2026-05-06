import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internalMutation, internalQuery, mutation, query } from 'lib/convex';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import { ensureTaskOwner } from './tasks.private';
import {
	addActions,
	authorizeAction,
	cancelPendingCompanionActions,
	findAction,
	findActionsPaginated,
	findLastActions,
} from './action.private';

// used by explicit UI authorization; reactor claim authorizes inline to avoid recursion
export const _authorize = internalMutation({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
		approver: z.union([
			zid('users'), //
			z.literal('auto'),
		]),
		isAuthorized: z.boolean(),
	},
	handler: authorizeAction,
});

// used by magicRock history rendering and by reactor's consecutive-companion guard
export const _findLastActions = internalQuery({
	args: {
		taskId: zid('tasks'),
		amount: z.number().min(1),
	},
	handler: findLastActions,
});

export const act = mutation({
	args: {
		taskId: zid('tasks'),
		skills: z.array(z.object({ skillKey: z.string(), args: z.record(z.unknown()) })).min(1),
		shouldReopen: z.boolean().optional().default(true),
		loop: z.enum(['seek', 'silent']).optional().default('seek'),
	},
	handler: async (ctx, { taskId, skills, shouldReopen, loop }) => {
		//
		console.debug(`using ${skills.map((s) => s.skillKey).join(', ')} on task '${taskId}'`);

		const { currentUser } = await ensureTaskOwner(ctx, { taskId });

		if (loop === 'seek') {
			await cancelPendingCompanionActions(ctx, {
				taskId,
				owner: currentUser._id,
			});
		}

		return await addActions(ctx, {
			skills,
			taskId,
			depth: 0,
			author: currentUser._id,
			owner: currentUser._id,
			reactionTrigger: loop === 'silent' ? 'none' : 'finish',
			shouldReopen,
		});
	},
});

export const authorize = mutation({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
		isAuthorized: z.boolean(),
	},
	handler: async (ctx, { taskId, actionId, isAuthorized }) => {
		//
		const { currentUser } = await ensureTaskOwner(ctx, { taskId });

		await authorizeAction(ctx, {
			taskId,
			actionId,
			approver: currentUser._id,
			isAuthorized,
		});
	},
});

export const findAllPaginated = query({
	args: {
		taskId: zid('tasks'),
		paginationOpts: paginationOptionsSchema,
	},
	handler: async (ctx, { taskId, paginationOpts }) => {
		//
		await ensureTaskOwner(ctx, { taskId });

		return await findActionsPaginated(ctx, { taskId, paginationOpts });
	},
});

export const findOne = query({
	args: {
		actionId: zid('actions'),
	},
	handler: async (ctx, { actionId }) => {
		//
		const action = await findAction(ctx, { actionId });

		await ensureTaskOwner(ctx, { taskId: action.taskId });

		return action;
	},
});
