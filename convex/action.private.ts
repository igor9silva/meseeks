import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { runNextActionIfNeeded } from './action/lifecycle.private';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { actionStatusSchema, pendingActionStatusSchema } from 'schemas/actionSchema';
import { authorSchema } from 'schemas/authorSchema';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import { setTaskStatus } from './tasks.private';
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

		await ctx.db.patch(action._id, {
			status: 'skipped' as const,
			costs: [
				// unlimited interruption costs are covered under the Pro subscription
			],
			result: {
				text: `stopped by ${authorIsOwner ? 'human' : author}`,
				reactions: [],
			},
		});
	},
});

// this will skip all pending companion (author !== owner) actions
// running actions won't be stopped
export const skipAllPendingReactions = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		owner: zid('users'),
		shouldSkipRunning: z.boolean(),
	}),
	handler: async (ctx, { taskId, owner, shouldSkipRunning }) => {
		//
		console.debug('skipping all pending reactions taskId', taskId, 'owner', owner);

		const pendingReactions = await Promise.all([
			findReactions(ctx, { taskId, owner, status: 'enqueued' }),
			findReactions(ctx, { taskId, owner, status: 'pending authorization' }),
		]).then(([A, B]) => A.concat(B));

		console.debug('pending reactions', pendingReactions);

		// TODO: maybe this also must call resolve
		await Promise.all(
			pendingReactions.map((action) =>
				ctx.db.patch(action._id, {
					status: 'skipped',
					costs: [],
					result: {
						text: 'new human actions happened before this one could run',
						reactions: [],
					},
				}),
			),
		);

		if (shouldSkipRunning) {
			await stopRunningAction(ctx, { taskId, author: owner, authorIsOwner: true });
		}
	},
});

// TODO: I think this should be splitted/abstracted
// one logic for auto-approval (i.e. from within action.perform())
// another one for explicit human approval/rejection (i.e. from the UI)
// e.g. update the task status from here feels wrong
// instintic: if reject, should call resolve
//	also maybe rename 'resolve' to something else because of task's
export const authorizeAction = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		actionId: zid('actions'),
		approver: z.union([
			zid('users'), //
			z.literal('auto'),
		]),
		hasApproved: z.boolean(),
	}),
	handler: async (ctx, { taskId, actionId, approver, hasApproved }) => {
		//
		const action = await findAction(ctx, { actionId });
		if (action.approvedAt) return;

		// if already running, keep running - else enqueue
		const approvedStatus = action.status === 'running' ? ('running' as const) : ('enqueued' as const);

		console.debug(`${approver} ${hasApproved ? 'approved' : 'rejected'} ${action.skillKey} (${action._id})`);

		const patch = hasApproved
			? {
					status: approvedStatus,
					approvedBy: approver,
					approvedAt: Date.now(),
				}
			: {
					status: 'skipped' as const,
					costs: [],
					result: {
						text: 'rejected by ' + approver,
						reactions: [],
					},
				};

		// if rejected by user, go back to 'idle' (not 'unread' because it's an explicit user action)
		if (!hasApproved) {
			await setTaskStatus(ctx, { taskId, newStatus: 'idle' });
		}

		await ctx.db.patch(actionId, patch);
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
		shouldReopen: z.boolean().optional().default(false),
	}),
	handler: async (ctx, { taskId, owner, author, skills, depth, shouldReopen }) => {
		//
		const task = await ctx.db.get(taskId);
		if (!task) throw NotFound();

		// skip all pending reactions if adding human actions
		if (author === owner) {
			await skipAllPendingReactions(ctx, { taskId, owner, shouldSkipRunning: true });
		}

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
		shouldReopen: z.boolean().optional().default(false),
	}),
	handler: async (ctx, { taskId, owner, author, skillKey, args, depth, shouldReopen }) => {
		//
		const actionIds = await addActions(ctx, {
			taskId,
			author,
			owner,
			depth,
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

export const findRunningActions = defineQuery({
	args: z.object({
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { taskId }) => {
		//
		return await findByStatus(ctx, { taskId, status: 'running' }).collect();
	},
});

export const findPendingAuthorizationAction = defineQuery({
	args: z.object({
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { taskId }) => {
		//
		return await findByStatus(ctx, { taskId, status: 'pending authorization' }).first();
	},
});

export const skipPendingAuthorizationByTaskAuthor = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		author: authorSchema,
		reasonText: z.string(),
	}),
	handler: async (ctx, { taskId, author, reasonText }) => {
		//
		const pendingActions = await ctx.db
			.query('actions')
			.withIndex('by_task_author_status', (q) =>
				q
					.eq('taskId', taskId) //
					.eq('author', author)
					.eq('status', 'pending authorization'),
			)
			.order('asc')
			.collect();

		return await Promise.all(
			pendingActions.map((action) =>
				ctx.db.patch(action._id, {
					status: 'skipped' as const,
					costs: [],
					result: {
						text: reasonText,
						reactions: [],
					},
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
		return findByStatus(ctx, { taskId, status: 'enqueued' }).first();
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
