import { zid } from 'convex-helpers/server/zod';
import { z } from 'zod';
import { _addMany as _addActions } from '../action/private';
import { internalMutation, internalQuery } from '../lib';
import { InsufficientAccountFunds, NotFound } from '../lib/errors';
import { asBigInt, asDollars } from '../lib/money';
import { _cancelAllForTask } from '../schedules/private';
import { authorSchema } from '../schemas/authorSchema';
import { modelsSchema } from '../schemas/skillSchema';
import { taskStatusSchema } from '../schemas/taskSchema';
import { _addFundTask, _addRefundTask } from '../transactions/private';
import { _findOne as _findOneUser } from '../users/private';

export const _findOne = internalQuery({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		const task = await ctx.db.get(taskId);
		if (!task) throw new Error('Task not found');

		return task;
	},
});

// export const _findAllNotEmbedded = internalQuery({
// 	args: {},
// 	handler: async (ctx) => {
// 		//
// 		return await ctx.db
// 			.query('tasks')
// 			.withIndex('by_embeddingId', (q) => q.eq('embeddingId', undefined))
// 			.collect();
// 	},
// });

// export const _findAllByEmbeddingIds = internalQuery({
// 	args: {
// 		embeddings: z.array(
// 			z.object({
// 				_id: zid('taskEmbeddings'),
// 				_score: z.number(),
// 			}),
// 		),
// 	},
// 	handler: async (ctx, { embeddings }) => {
// 		//
// 		const tasks = await Promise.all(
// 			embeddings.map(async ({ _id, _score }) => {
// 				const task = await ctx.db
// 					.query('tasks')
// 					.withIndex('by_embeddingId', (q) => q.eq('embeddingId', _id))
// 					.unique();

// 				if (!task) return null;

// 				return {
// 					...task,
// 					description: undefined, // not sending description to avoid too much data
// 					_score,
// 				};
// 			}),
// 		);

// 		return tasks.filter((task) => task !== null);
// 	},
// });

export const _findActiveTasks = internalQuery({
	args: {
		owner: zid('users'),
	},
	handler: async (ctx, { owner }) => {
		//
		return await ctx.db
			.query('tasks')
			.withIndex('by_owner_isActive', (q) =>
				q
					.eq('owner', owner) //
					.eq('isActive', true),
			)
			.collect();
	},
});

export const _add = internalMutation({
	args: {
		author: authorSchema,
		owner: zid('users'),
		message: z.string().optional(),
		parentId: zid('tasks').optional(),
		preferredIntelligence: modelsSchema.optional(),
		initialFunds: z
			.bigint()
			.min(0n)
			.max(asBigInt({ dollars: 100000 }))
			.optional(),
	},
	handler: async (ctx, { author, owner, message, parentId, initialFunds, preferredIntelligence }) => {
		//
		const taskId = await ctx.db.insert('tasks', {
			author,
			owner,
			parentId,
			status: 'idle',
			isActive: true,
			budgetUSDC: {
				total: 0n,
				available: 0n,
			},
			preferredIntelligence,
		});

		// TODO: receive actions instead of using hardcoded ones
		// also, should we have a `createTask` action? to make it explicit?
		// instead: no explicit createTask(), you just act() and a new task is created if not provided

		await _addActions(ctx, {
			taskId,
			author,
			owner,
			depth: 0,
			skills: [
				{
					skillKey: 'increaseBudget',
					args: { amount: initialFunds, shouldIterate: false },
				},
				{
					skillKey: 'say',
					args: { message },
				},
			],
		});

		return taskId;
	},
});

export const _addWithActions = internalMutation({
	args: {
		author: authorSchema,
		owner: zid('users'),
		title: z.string().optional(),
		instructions: z.string().optional(),
		parentId: zid('tasks').optional(),
		preferredIntelligence: modelsSchema.optional(),
		skills: z.array(
			z.object({
				skillKey: z.string().describe('The key of the skill to use'),
				args: z.record(z.any()),
			}),
		),
	},
	handler: async (ctx, { author, owner, title, instructions, parentId, preferredIntelligence, skills }) => {
		//
		const taskId = await ctx.db.insert('tasks', {
			author,
			owner,
			title,
			instructions,
			parentId,
			status: 'idle',
			isActive: true,
			budgetUSDC: {
				total: 0n,
				available: 0n,
			},
			preferredIntelligence,
		});

		await _addActions(ctx, {
			taskId,
			author,
			owner,
			depth: 0,
			skills,
		});

		return taskId;
	},
});

export const _addInboxTask = internalMutation({
	args: {
		author: authorSchema,
		owner: zid('users'),
	},
	handler: async (ctx, { author, owner }) => {
		//
		const taskId = await ctx.db.insert('tasks', {
			author,
			owner,
			title: 'Look at me!',
			status: 'idle',
			isActive: true,
			budgetUSDC: {
				total: 0n,
				available: 0n,
			},
			instructions: `
# Look at me!
## ooh-wee, welcome to Meseeks! 
Here, everything is a task.
<br />
Every time a task gets **marked as done**, we summarize and learn from it, so other tasks can have amplified context on you and everything you've been doing 😌
<br />
#### This box is the task description.
It's a place were you - **or your Meseeks** - can add details on what you are seeking, constraints, instructions, files, or anything you want.

------------------------------------
Every piece of text is dynamic, **try tapping with 3 fingers** (or middle mouse button) here. Powered by [Markdown](https://en.wikipedia.org/wiki/Markdown) and *React Components* 🔥
<br />
You can do that in messages as well. **Have fun 👻**.

------------------------------------

<p className="text-sm text-muted-foreground">**Tip:** type \`<EasterEgg />\` in the chatbox.</p>

------------------------------------
Oh, there is one more thing. **Verified humans get 500 actions ⚡ for free!**
<br />
On the command bar you should see your balance: <Balance />
<br />
Each task gets it's own budget until it's done. **The larger the budget, the more autonomous it gets.**
<br />
If you need more funds, look for "Top up".
<br />
Happy hacking 🚀
`.trim(),
		});

		await _increaseBudget(ctx, { taskId, amount: 1n });

		// await _addAction(ctx, {
		// 	taskId,
		// 	author,
		// 	owner,
		// 	skillKey: 'say',
		// 	args: { message: description },
		// });

		return taskId;
	},
});

// export const _semanticSearch = internalAction({
// 	args: {
// 		query: z.string(),
// 	},
// 	handler: async (ctx, { query }): Promise<Array<Doc<'tasks'> & { _score: number }>> => {
// 		//
// 		const { embedding, usage } = await embed({
// 			model: openai.embedding('text-embedding-3-large'),
// 			value: query,
// 		});

// 		console.log('embedding usage', usage);

// 		const results = await ctx.vectorSearch('taskEmbeddings', 'by_embedding', {
// 			vector: embedding,
// 			limit: 16,
// 			// filter: (q) => q.eq('isDone', false),
// 		});

// 		const tasks = await ctx.runQuery(internal.tasks.private._findAllByEmbeddingIds, {
// 			embeddings: results,
// 		});

// 		return tasks;
// 	},
// });

// export const _addEmbedding = internalMutation({
// 	args: {
// 		taskId: zid('tasks'),
// 		embedding: z.array(z.number()),
// 		isDone: z.boolean(),
// 	},
// 	handler: async (ctx, { taskId, embedding, isDone }) => {
// 		//
// 		const embeddingId = await ctx.db.insert('taskEmbeddings', { taskId, embedding, isDone });
// 		await ctx.db.patch(taskId, { embeddingId });
// 	},
// });

// export const _removeEmbedding = internalMutation({
// 	args: {
// 		taskId: zid('tasks'),
// 	},
// 	handler: async (ctx, { taskId }) => {
// 		//
// 		const task = await _findOne(ctx, { taskId });
// 		if (!task.embeddingId) return;

// 		await ctx.db.patch(taskId, { embeddingId: undefined });
// 		await ctx.db.delete(task.embeddingId);
// 	},
// });

// export const _embedTask = internalAction({
// 	args: {
// 		taskId: zid('tasks'),
// 	},
// 	handler: async (ctx, { taskId }) => {
// 		//
// 		const task = await ctx.runQuery(internal.tasks.private._findOne, { taskId });

// 		if (!task.instructions) return;

// 		const { embedding, usage } = await embed({
// 			model: openai.embedding('text-embedding-3-large'),
// 			value: task.instructions,
// 		});

// 		console.log('embedding usage', usage);

// 		await ctx.runMutation(internal.tasks.private._addEmbedding, {
// 			taskId,
// 			embedding,
// 			status: task.status,
// 		});
// 	},
// });

// export const _embedAllMissingTasks = internalAction({
// 	args: {},
// 	handler: async (ctx) => {
// 		//
// 		const tasks = await ctx.runQuery(internal.tasks.private._findAllNotEmbedded);

// 		for (const task of tasks) {
// 			await ctx.runAction(internal.tasks.private._embedTask, { taskId: task._id });
// 		}
// 	},
// });

export const _updateInstructions = internalMutation({
	args: {
		taskId: zid('tasks'),
		title: z.string().optional(),
		instructions: z.string().optional(),
	},
	handler: async (ctx, { taskId, title, instructions }) => {
		//
		if (title === undefined && instructions === undefined) throw new Error('Nothing to do');

		return await ctx.db.patch(taskId, {
			...(title !== undefined && { title }),
			...(instructions !== undefined && { instructions }),
			lastUpdatedAt: Date.now(),
		});
	},
});

export const _updateSummary = internalMutation({
	args: {
		taskId: zid('tasks'),
		summary: z.string(),
	},
	handler: async (ctx, { taskId, summary }) => {
		//
		return await ctx.db.patch(taskId, {
			summary,
			lastSummarizedAt: Date.now(),
		});
	},
});

export const _markAsRead = internalMutation({
	args: {
		taskId: zid('tasks'),
	},
	handler: async (ctx, { taskId }) => {
		//
		const task = await _findOne(ctx, { taskId });

		if (task.status === 'unread' || task.status === 'blocked') {
			await _setStatus(ctx, { taskId, newStatus: 'idle' });
		}
	},
});

export const _setStatus = internalMutation({
	args: {
		taskId: zid('tasks'),
		newStatus: taskStatusSchema,
	},
	handler: async (ctx, { taskId, newStatus }) => {
		//
		const task = await _findOne(ctx, { taskId });
		if (!task) throw new Error('Task not found');

		const oldStatus = task.status;

		if (newStatus === 'done' || newStatus === 'discarded') {
			//
			// remove funds from the task
			if (task.budgetUSDC.available > 0n) {
				await _removeFunds(ctx, { taskId, amount: task.budgetUSDC.available });
			}

			// cancel all active schedules for this task
			const cancelledCount = await _cancelAllForTask(ctx, { taskId });
			if (cancelledCount > 0) {
				console.debug(`Cancelled ${cancelledCount} schedule(s) for task ${taskId} (status: ${newStatus})`);
			}
		}

		// TODO: send push notification if status changed to unread or blocked
		if (oldStatus !== newStatus && (newStatus === 'unread' || newStatus === 'blocked')) {
			console.debug(
				`Task ${taskId} status changed from ${oldStatus} to ${newStatus}, will add notification once API is generated`,
			);
		}

		return await ctx.db.patch(taskId, {
			status: newStatus,
			isActive: newStatus !== 'done' && newStatus !== 'discarded',
		});
	},
});

// export const _learn = internalAction({
// 	args: {
// 		taskId: zid('tasks'),
// 	},
// 	handler: async (ctx, { taskId }) => {
// 		//
// 		const task = await ctx.runQuery(internal.tasks.private._findOne, { taskId });
// 		if (!task) throw new Error('Task not found');

// 		if (!task.resolution) {
// 			console.warn('Cannot learn from task without resolution', taskId);
// 			return false;
// 		}

// 		// TODO: Implement learning logic here
// 		// This would typically involve:
// 		// 1. Extracting knowledge from the task and its resolution
// 		// 2. Storing this knowledge in a knowledge base
// 		// 3. Updating embeddings or other data structures for future reference

// 		console.log('Learning from task', taskId);

// 		// Re-embed the task with its resolution for better semantic search
// 		// await ctx.runAction(internal.tasks.private._embedTask, { taskId });

// 		return true;
// 	},
// });

export const _useFunds = internalMutation({
	args: {
		taskId: zid('tasks'),
		amount: z.bigint().min(0n),
	},
	handler: async (ctx, { taskId, amount }) => {
		//
		const task = await _findOne(ctx, { taskId });
		if (!task) throw new Error('Task not found');

		console.debug(`using ${asDollars({ bigInt: amount })} from task ${taskId}`);

		if (task.budgetUSDC.available < amount) {
			//
			console.warn(
				'Insufficient funds on task',
				taskId,
				'cost',
				asDollars({ bigInt: amount }),
				'available',
				asDollars({ bigInt: task.budgetUSDC.available }),
				'missing',
				asDollars({ bigInt: amount - task.budgetUSDC.available }),
				'Will use all available funds',
			);

			amount = task.budgetUSDC.available;
		}

		// update the task balance
		await ctx.db.patch(taskId, {
			budgetUSDC: {
				total: task.budgetUSDC.total,
				available: task.budgetUSDC.available - amount,
			},
		});
	},
});

export const _increaseBudget = internalMutation({
	args: {
		taskId: zid('tasks'),
		amount: z.bigint().min(0n),
	},
	handler: async (ctx, { taskId, amount }) => {
		//
		const task = await _findOne(ctx, { taskId });
		if (!task) throw NotFound();

		const user = await _findOneUser(ctx, { userId: task.owner });
		if (!user) throw NotFound();

		const currentBalance = user.balanceUSD ?? 0n;

		console.debug(
			'increasing budget to task',
			taskId,
			asDollars({ bigInt: amount }),
			'current balance',
			asDollars({ bigInt: currentBalance }),
		);

		if (currentBalance < amount) throw InsufficientAccountFunds();

		// TODO: shouldn't this be an action?
		// create the transaction
		await _addFundTask(ctx, {
			taskId,
			owner: task.owner,
			value: {
				symbol: 'USD',
				amount: -amount,
			},
		});

		// update the task balance
		await ctx.db.patch(taskId, {
			budgetUSDC: {
				total: task.budgetUSDC.total + amount,
				available: task.budgetUSDC.available + amount,
			},
		});
	},
});

export const _removeFunds = internalMutation({
	args: {
		taskId: zid('tasks'),
		amount: z.bigint().min(0n),
	},
	handler: async (ctx, { taskId, amount }) => {
		//
		const task = await _findOne(ctx, { taskId });
		if (!task) throw new Error('Task not found');

		// create the transaction
		await _addRefundTask(ctx, {
			taskId,
			owner: task.owner,
			value: { symbol: 'USD', amount },
			description: 'Refund of unused funds',
		});

		// update the task balance
		await ctx.db.patch(taskId, {
			budgetUSDC: {
				total: task.budgetUSDC.total - amount,
				available: task.budgetUSDC.available - amount,
			},
		});
	},
});

export const _move = internalMutation({
	args: {
		taskId: zid('tasks'),
		newParentId: zid('tasks').optional(),
	},
	handler: async (ctx, { taskId, newParentId }) => {
		//
		return await ctx.db.patch(taskId, { parentId: newParentId });

		// TODO: forbid adding to itself
		// TODO: report to parents as well, old and new
	},
});

export const _setPreferredIntelligence = internalMutation({
	args: {
		taskId: zid('tasks'),
		preferredIntelligence: modelsSchema,
	},
	handler: async (ctx, { taskId, preferredIntelligence }) => {
		//
		return await ctx.db.patch(taskId, { preferredIntelligence });
	},
});
