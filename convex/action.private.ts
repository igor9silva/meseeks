import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { interrupt, isStarted, runNextActionIfNeeded, skip } from './reactor.private';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { actionStatusSchema, pendingActionStatusSchema, reactionTriggerSchema } from 'schemas/actionSchema';
import { authorSchema } from 'schemas/authorSchema';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import { findTask, setTaskStatus } from './tasks.private';
import { MutationCtx, QueryCtx } from 'convex/_generated/server';
import { Id } from 'convex/_generated/dataModel';

export const findAction = defineQuery({
	args: z.object({
		actionId: zid('actions'),
	}),
	handler: async (ctx, { actionId }) => {
		//
		const action = await ctx.db.get(actionId);
		if (!action) throw NotFound();

		return action;
	},
});

export const findRunningAction = defineQuery({
	args: z.object({
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { taskId }) => {
		//
		return await findByStatus(ctx, { taskId, status: 'running' }).first();
	},
});

export const findReactions = defineQuery({
	args: z.object({
		taskId: zid('tasks'),
		owner: zid('users'),
		status: pendingActionStatusSchema.exclude(['running']),
	}),
	handler: async (ctx, { taskId, owner, status }) => {
		//
		return await ctx.db
			.query('actions')
			.withIndex('by_task_status', (q) =>
				q
					.eq('taskId', taskId) //
					.eq('status', status),
			)
			.filter((q) => q.neq(q.field('author'), owner)) // author !== owner
			.collect();
	},
});

export const stopRunningAction = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		author: authorSchema,
		authorIsOwner: z.boolean(),
	}),
	handler: async (ctx, { taskId, author, authorIsOwner }) => {
		//
		const action = await findRunningAction(ctx, { taskId });
		if (!action) return;

		if (isStarted(action)) {
			await interrupt(ctx, { action, author });
			return;
		}

		await skip(ctx, {
			action,
			reason: `stopped by ${authorIsOwner ? 'human' : author}`,
		});
	},
});

// cancels companion work when a new seek trigger takes over the task
export const cancelPendingCompanionActions = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		owner: zid('users'),
	}),
	handler: async (ctx, { taskId, owner }) => {
		//
		console.debug('cancel pending companion actions taskId', taskId, 'owner', owner);

		const pendingReactions = await Promise.all([
			findReactions(ctx, { taskId, owner, status: 'enqueued' }),
			findReactions(ctx, { taskId, owner, status: 'blocked' }),
		]).then(([A, B]) => A.concat(B));

		console.debug('pending companion actions', pendingReactions);

		// skip routes through reactor finish so all terminal writes stay unified
		await Promise.all(
			pendingReactions.map((action) =>
				skip(ctx, {
					action,
					reason: 'new human actions happened before this one could run',
				}),
			),
		);

		await stopRunningAction(ctx, {
			taskId,
			author: owner,
			authorIsOwner: true,
		});
	},
});

// explicit human authorization/rejection for an action already blocked by reactor claim
export const authorizeAction = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		actionId: zid('actions'),
		approver: z.union([
			zid('users'), //
			z.literal('auto'),
		]),
		isAuthorized: z.boolean(),
	}),
	handler: async (ctx, { taskId, actionId, approver, isAuthorized }) => {
		//
		const action = await findAction(ctx, { actionId });

		if (action.taskId !== taskId) throw NotFound();
		if (action.status !== 'blocked') {
			console.info(`Ignoring stale authorization for ${action._id}; status is ${action.status}.`);
			return;
		}

		console.debug(`${approver} ${isAuthorized ? 'authorized' : 'rejected'} ${action.skillKey} (${action._id})`);

		if (isAuthorized) {
			//
			await ctx.db.patch(actionId, {
				status: 'enqueued',
				approvedBy: action.approvedBy ?? approver,
				approvedAt: action.approvedAt ?? Date.now(),
			});

			await runNextActionIfNeeded(ctx, { taskId });
			return;
		}

		// if rejected by user, go back to 'idle' (not 'unread' because it's an explicit user action)
		await setTaskStatus(ctx, { taskId, newStatus: 'idle' });

		await skip(ctx, {
			action,
			reason: 'rejected by ' + approver,
		});
		await runNextActionIfNeeded(ctx, { taskId });
	},
});

export const addActions = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		owner: zid('users'),
		author: authorSchema,
		skills: z.array(
			z.object({
				skillKey: z.string(),
				args: z.record(z.unknown()),
			}),
		),
		depth: z.number(),
		reactionTrigger: reactionTriggerSchema.optional().default('finish'),
		shouldReopen: z.boolean().optional().default(false),
	}),
	handler: async (ctx, { taskId, owner, author, skills, depth, reactionTrigger, shouldReopen }) => {
		//
		const task = await findTask(ctx, { taskId });

		// reopen if needed and requested
		const skillsToSchedule = (() => {
			//
			const hasReopen = skills.some((skill) => skill.skillKey === 'reopen');

			if (!task.isActive && shouldReopen && !hasReopen) {
				return [{ skillKey: 'reopen', args: {} }].concat(skills);
			}

			return skills;
		})();

		const actionIds = await Promise.all(
			skillsToSchedule.map((skill) =>
				ctx.db.insert('actions', {
					taskId,
					author,
					owner,
					depth,
					status: 'enqueued',
					result: null,
					skillKey: skill.skillKey,
					args: skill.args,
					reactionTrigger,
				}),
			),
		);

		await runNextActionIfNeeded(ctx, { taskId });

		return actionIds;
	},
});

export const addAction = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		owner: zid('users'),
		author: authorSchema,
		skillKey: z.string(),
		args: z.record(z.unknown()),
		depth: z.number(),
		reactionTrigger: reactionTriggerSchema.optional().default('finish'),
		shouldReopen: z.boolean().optional().default(false),
	}),
	handler: async (ctx, { taskId, owner, author, skillKey, args, depth, reactionTrigger, shouldReopen }) => {
		//
		const actionIds = await addActions(ctx, {
			taskId,
			author,
			owner,
			depth,
			reactionTrigger,
			shouldReopen,
			skills: [{ skillKey, args }],
		});

		return actionIds[0];
	},
});

export const findActionsSince = defineQuery({
	args: z.object({
		taskId: zid('tasks'),
		since: z.number(),
	}),
	handler: async (ctx, { taskId, since }) => {
		//
		return await ctx.db
			.query('actions')
			.withIndex('by_task', (q) =>
				q
					.eq('taskId', taskId) //
					.gte('_creationTime', since),
			)
			.collect();
	},
});

export const findActionsPaginated = defineQuery({
	args: z.object({
		taskId: zid('tasks'),
		paginationOpts: paginationOptionsSchema,
	}),
	handler: async (ctx, { taskId, paginationOpts }) => {
		//
		return await ctx.db
			.query('actions')
			.withIndex('by_task', (q) => q.eq('taskId', taskId))
			.order('desc')
			.paginate(paginationOpts);
	},
});

export const findBlockedAction = defineQuery({
	args: z.object({
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { taskId }) => {
		//
		return await findByStatusDepth(ctx, { taskId, status: 'blocked' }).first();
	},
});

export const skipBlockedByTaskAuthor = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		author: authorSchema,
		reasonText: z.string(),
	}),
	handler: async (ctx, { taskId, author, reasonText }) => {
		//
		const blockedActions = await ctx.db
			.query('actions')
			.withIndex('by_task_author_status', (q) =>
				q
					.eq('taskId', taskId) //
					.eq('author', author)
					.eq('status', 'blocked'),
			)
			.order('asc')
			.collect();

		return await Promise.all(
			blockedActions.map((action) =>
				skip(ctx, {
					action,
					reason: reasonText,
				}),
			),
		);
	},
});

export const findNextAction = defineQuery({
	args: z.object({
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { taskId }) => {
		//
		return findByStatusDepth(ctx, { taskId, status: 'enqueued' }).first();
	},
});

export const findLastActions = defineQuery({
	args: z.object({
		taskId: zid('tasks'),
		amount: z.number(),
	}),
	handler: async (ctx, { taskId, amount }) => {
		//
		return await ctx.db
			.query('actions')
			.withIndex('by_task', (q) => q.eq('taskId', taskId))
			.order('desc')
			.take(amount);
	},
});

// helper, not exported — can be used with .first() or .collect()
const findByStatus = (
	ctx: QueryCtx | MutationCtx,
	{ taskId, status }: { taskId: Id<'tasks'>; status: z.infer<typeof actionStatusSchema> },
) => {
	return ctx.db
		.query('actions')
		.withIndex('by_task_status', (q) =>
			q
				.eq('taskId', taskId) //
				.eq('status', status),
		)
		.order('asc');
	};

const findByStatusDepth = (
	ctx: QueryCtx | MutationCtx,
	{ taskId, status }: { taskId: Id<'tasks'>; status: z.infer<typeof actionStatusSchema> },
) => {
	return ctx.db
		.query('actions')
		.withIndex('by_task_status_depth', (q) =>
			q
				.eq('taskId', taskId) //
				.eq('status', status),
		)
		.order('asc');
};
