import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { Id } from '../_generated/dataModel';
import { QueryCtx } from '../_generated/server';
import { internalMutation, internalQuery } from '../lib';
import { actionSchema, newActionSchema } from '../schemas/actionSchema';
import { authorSchema } from '../schemas/authorSchema';
import { paginationOptionsSchema } from '../schemas/paginationOptionsSchema';
import { _findOne as _findOneTask, _setStatus as _setTaskStatus } from '../tasks/private';
import { _runNextActionIfNeeded } from './lifecycle/private';

export const _add = internalMutation({
	args: {
		...newActionSchema.shape,
		shouldReopen: z.boolean().optional().default(false),
	},
	handler: async (ctx, { taskId, author, owner, skillKey, args, depth, shouldReopen }) => {
		//
		const actionIds = await _addMany(ctx, {
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
export const _addMany = internalMutation({
	args: {
		taskId: zid('tasks'),
		owner: zid('users'),
		author: authorSchema,
		depth: z.number().min(0).max(1000),
		shouldReopen: z.boolean().optional().default(false),
		skills: z.array(
			z.object({
				skillKey: z.string().describe('The key of the skill to use'),
				args: z.record(z.any()),
			}),
		),
	},
	handler: async (ctx, { taskId, owner, author, skills, depth, shouldReopen }) => {
		//
		const task = await _findOneTask(ctx, { taskId });

		// skip all pending reactions if adding human actions
		if (author === owner) {
			await _skipAllPendingReactions(ctx, { taskId, owner, shouldSkipRunning: true });
		}

		// reopen if needed and requested
		if (!task.isActive && shouldReopen) {
			skills.unshift({ skillKey: 'reopen', args: {} });
		}

		const actionIds = await Promise.all(
			skills.map((skill) =>
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

		await _runNextActionIfNeeded(ctx, taskId);

		return actionIds;
	},
});

// TODO: I think this should be splitted/abstracted
// one logic for auto-approval (i.e. from within action.perform())
// another one for explicit human approval/rejection (i.e. from the UI)
// e.g. update the task status from here feels wrong
// instintic: if reject, should call resolve
//	also maybe rename 'resolve' to something else because of task's
export const _authorize = internalMutation({
	args: {
		taskId: zid('tasks'),
		actionId: zid('actions'),
		approver: z.union([
			zid('users'), //
			z.literal('auto'),
		]),
		hasApproved: z.boolean(),
	},
	handler: async (ctx, { taskId, actionId, approver, hasApproved }) => {
		//
		const action = await _findOne(ctx, { actionId });
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
			await _setTaskStatus(ctx, { taskId, newStatus: 'idle' });
		}

		await ctx.db.patch(actionId, patch);
		await _runNextActionIfNeeded(ctx, taskId);
	},
});

// ------------------------------------

export const _findAllSince = internalQuery({
	args: {
		taskId: zid('tasks'),
		since: z.number(),
	},
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

export const _findAllPaginated = internalQuery({
	args: {
		taskId: zid('tasks'),
		paginationOpts: paginationOptionsSchema,
	},
	handler: async (ctx, { taskId, paginationOpts }) => {
		//
		return await ctx.db
			.query('actions')
			.withIndex('by_task', (q) => q.eq('taskId', taskId))
			.order('desc')
			.paginate(paginationOpts);
	},
});

export const _findOne = internalQuery({
	args: {
		actionId: zid('actions'),
	},
	handler: async (ctx, { actionId }) => {
		//
		const action = await ctx.db.get(actionId);
		if (!action) throw new Error('Action not found');

		return action;
	},
});

export const _findAllRunning = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		return await _findByStatus(ctx, { taskId, status: 'running' }).collect();
	},
});

export const _findRunning = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		return await _findByStatus(ctx, { taskId, status: 'running' }).first();
	},
});

export const _findPendingAuthorization = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		return await _findByStatus(ctx, { taskId, status: 'pending authorization' }).first();
	},
});

export const _findNext = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		return await _findByStatus(ctx, { taskId, status: 'enqueued' }).first();
	},
});

export const _findReactions = internalQuery({
	args: {
		taskId: zid('tasks'),
		owner: zid('users'),
		status: z.enum(['enqueued', 'pending authorization']),
	},
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

export const _findLastActions = internalQuery({
	args: {
		taskId: zid('tasks'),
		amount: z.number().min(1),
	},
	handler: async (ctx, { taskId, amount }) => {
		//
		return await ctx.db
			.query('actions')
			.withIndex('by_task', (q) => q.eq('taskId', taskId))
			.order('desc')
			.take(amount);
	},
});

// this will skip all pending companion (author !== owner) actions
// running actions won't be stopped
export const _skipAllPendingReactions = internalMutation({
	args: {
		taskId: zid('tasks'),
		owner: zid('users'),
		shouldSkipRunning: z.boolean().optional().default(false),
	},
	handler: async (ctx, { taskId, owner, shouldSkipRunning }) => {
		//
		console.debug('skipping all pending reactions taskId', taskId, 'owner', owner);

		const pendingReactions = await Promise.all([
			_findReactions(ctx, { taskId, owner, status: 'enqueued' }),
			_findReactions(ctx, { taskId, owner, status: 'pending authorization' }),
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
			await _stop(ctx, { taskId, author: owner, authorIsOwner: true });
		}
	},
});

export const _stop = internalMutation({
	args: {
		taskId: zid('tasks'),
		author: authorSchema,
		authorIsOwner: z.boolean(),
	},
	handler: async (ctx, { taskId, author, authorIsOwner }) => {
		//
		const action = await _findRunning(ctx, { taskId });
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

function _findByStatus(
	ctx: QueryCtx,
	{
		taskId,
		status,
	}: {
		taskId: Id<'tasks'>;
		status: z.infer<typeof actionSchema>['status'];
	},
) {
	return ctx.db
		.query('actions')
		.withIndex('by_task_status', (q) =>
			q
				.eq('taskId', taskId) //
				.eq('status', status),
		)
		.order('asc');
}
