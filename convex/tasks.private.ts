import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { addMany } from './action.private';
import { defineMutation, defineQuery } from 'lib/functions';
import { InsufficientAccountFunds, NotFound } from 'lib/errors';
import { asBigInt, asDollars } from 'lib/money';
import { cancelAllForTask } from './schedules.private';
import { authorSchema } from 'schemas/authorSchema';
import { intelligenceKeys } from 'schemas/intelligenceSchema';
import { taskStatusSchema } from 'schemas/taskSchema';
import { listEnabledSkillsWithDetails } from './skills.private';
import { addFundTask, addRefundTask } from './transactions.private';
import { findOne as findOneUser } from './users.private';

type EnabledSkillDetail = {
	key: string;
	description: string;
	inputSchema: string;
};

export const findOne = defineQuery({
	args: z.object({
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { taskId }) => {
		//
		const task = await ctx.db.get(taskId);
		if (!task) throw NotFound();

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

export const findActiveTasks = defineQuery({
	args: z.object({
		owner: zid('users'),
		limit: z.number().min(1).max(100).optional(),
	}),
	handler: async (ctx, { owner, limit }) => {
		//
		const query = ctx.db.query('tasks').withIndex('by_owner_isActive', (q) =>
			q
				.eq('owner', owner) //
				.eq('isActive', true),
		);

		// TODO: make sure higher budget tasks are first
		return limit ? await query.take(limit) : await query.collect();
	},
});

export const add = defineMutation({
	args: z.object({
		author: authorSchema,
		owner: zid('users'),
		message: z.string().optional(),
		parentId: zid('tasks').optional(),
		preferredIntelligence: intelligenceKeys.optional(),
		initialFunds: z
			.bigint()
			.min(0n)
			.max(asBigInt({ dollars: 100000 }))
			.optional(),
	}),
	handler: async (ctx, { author, owner, message, parentId, initialFunds, preferredIntelligence }) => {
		//
		const taskId = await ctx.db.insert('tasks', {
			author,
			owner,
			parentId,
			status: 'idle',
			isActive: true,
			energyBudget: {
				total: 0n,
				available: 0n,
			},
			preferredIntelligence,
			availableSkills: [],
		});

		// TODO: receive actions instead of using hardcoded ones
		// also, should we have a `createTask` action? to make it explicit?
		// instead: no explicit createTask(), you just act() and a new task is created if not provided

		const skills = [
			...(initialFunds && initialFunds > 0n
				? [
						{
							skillKey: 'increaseBudget',
							args: { amount: initialFunds, shouldIterate: false },
						},
					]
				: []),
			{
				skillKey: 'say',
				args: { message },
			},
		];

		await addMany(ctx, {
			taskId,
			author,
			owner,
			depth: 0,
			skills,
		});

		return taskId;
	},
});

export const addWithActions = defineMutation({
	args: z.object({
		author: authorSchema,
		owner: zid('users'),
		title: z.string().optional(),
		instructions: z.string().optional(),
		parentId: zid('tasks').optional(),
		preferredIntelligence: intelligenceKeys.optional(),
		skills: z.array(
			z.object({
				skillKey: z.string().describe('The key of the skill to use'),
				args: z.record(z.any()),
			}),
		),
	}),
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
			energyBudget: {
				total: 0n,
				available: 0n,
			},
			preferredIntelligence,
			availableSkills: [],
		});

		await addMany(ctx, {
			taskId,
			author,
			owner,
			depth: 0,
			skills,
		});

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

// 		const tasks = await ctx.runQuery(internal.tasks._findAllByEmbeddingIds, {
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
// 		const task = await ctx.runQuery(internal.tasks._findOne, { taskId });

// 		if (!task.instructions) return;

// 		const { embedding, usage } = await embed({
// 			model: openai.embedding('text-embedding-3-large'),
// 			value: task.instructions,
// 		});

// 		console.log('embedding usage', usage);

// 		await ctx.runMutation(internal.tasks._addEmbedding, {
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
// 		const tasks = await ctx.runQuery(internal.tasks._findAllNotEmbedded);

// 		for (const task of tasks) {
// 			await ctx.runAction(internal.tasks._embedTask, { taskId: task._id });
// 		}
// 	},
// });

export const updateInstructions = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		title: z.string().optional(),
		instructions: z.string().optional(),
		summary: z.string().optional(),
		availableSkills: z.array(z.string()).max(16).optional(),
		owner: zid('users'),
	}),
	handler: async (ctx, { taskId, title, instructions, summary, availableSkills, owner }) => {
		//
		if (
			title === undefined &&
			instructions === undefined &&
			summary === undefined &&
			availableSkills === undefined
		) {
			throw new Error('Nothing to do');
		}

		// make sure the skills are valid
		if (availableSkills) {
			//
			// get enabled skills - this is what the AI actually sees as available options
			const enabledSkills: EnabledSkillDetail[] = await listEnabledSkillsWithDetails(ctx, {
				userId: owner,
			});

			// create a set of enabled skill keys for fast lookup
			const enabledSkillKeys: Set<string> = new Set(enabledSkills.map((skill: EnabledSkillDetail) => skill.key));

			// find invalid skills (skills that are not enabled for the user)
			const validSkills = availableSkills.filter((skillKey) => enabledSkillKeys.has(skillKey));

			if (validSkills.length !== availableSkills.length) {
				const invalidSkills = availableSkills.filter((skillKey) => !enabledSkillKeys.has(skillKey));
				console.debug(`Invalid skills were selected: ${invalidSkills.join(', ')}. Ignored them.`);
				availableSkills = validSkills;
			}
		}

		// TODO: we're only updating if not undefined, shouldn't we replace instead?
		return await ctx.db.patch(taskId, {
			...(title !== undefined && { title }),
			...(instructions !== undefined && { instructions }),
			...(summary !== undefined && { summary }),
			...(availableSkills !== undefined && { availableSkills }),
			lastUpdatedAt: Date.now(),
		});
	},
});

export const addAvailableSkill = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		skillKey: z.string(),
	}),
	handler: async (ctx, { taskId, skillKey }) => {
		//
		const task = await findOne(ctx, { taskId });
		if (!task) throw NotFound();

		if (task.availableSkills?.includes(skillKey)) return;

		await ctx.db.patch(taskId, {
			availableSkills: [...(task.availableSkills ?? []), skillKey],
		});
	},
});

export const markAsRead = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
	}),
	handler: async (ctx, { taskId }) => {
		//
		const task = await findOne(ctx, { taskId });

		if (task.status === 'unread' || task.status === 'blocked') {
			await setStatus(ctx, { taskId, newStatus: 'idle' });
		}
	},
});

export const setStatus = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		newStatus: taskStatusSchema,
	}),
	handler: async (ctx, { taskId, newStatus }) => {
		//
		if (newStatus === 'done' || newStatus === 'discarded') {
			//
			const task = await findOne(ctx, { taskId });
			if (!task) throw NotFound();

			// remove funds from the task
			if (task.energyBudget.available > 0n) {
				await removeFunds(ctx, {
					taskId,
					amount: task.energyBudget.available,
				});
			}

			// cancel all active schedules for this task
			const cancelledCount = await cancelAllForTask(ctx, { taskId });
			if (cancelledCount > 0) {
				console.debug(`Cancelled ${cancelledCount} schedule(s) for task ${taskId} (status: ${newStatus})`);
			}
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
// 		const task = await ctx.runQuery(internal.tasks._findOne, { taskId });
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
// 		// await ctx.runAction(internal.tasks._embedTask, { taskId });

// 		return true;
// 	},
// });

export const useFunds = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		amount: z.bigint().min(0n),
	}),
	handler: async (ctx, { taskId, amount }) => {
		//
		const task = await findOne(ctx, { taskId });
		if (!task) throw NotFound();

		console.debug(`using ${asDollars({ bigInt: amount })} from task ${taskId}`);

		if (task.energyBudget.available < amount) {
			//
			console.warn(
				'Insufficient funds on task',
				taskId,
				'cost',
				asDollars({ bigInt: amount }),
				'available',
				asDollars({ bigInt: task.energyBudget.available }),
				'missing',
				asDollars({ bigInt: amount - task.energyBudget.available }),
				'Will use all available funds',
			);

			amount = task.energyBudget.available;
		}

		// update the task balance
		await ctx.db.patch(taskId, {
			energyBudget: {
				total: task.energyBudget.total,
				available: task.energyBudget.available - amount,
			},
		});
	},
});

export const increaseBudget = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		amount: z.bigint().min(0n),
	}),
	handler: async (ctx, { taskId, amount }) => {
		//
		const task = await findOne(ctx, { taskId });
		if (!task) throw NotFound();

		const user = await findOneUser(ctx, { userId: task.owner });
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
		await addFundTask(ctx, {
			taskId,
			owner: task.owner,
			value: {
				symbol: 'USD',
				amount: -amount,
			},
		});

		// update the task balance
		await ctx.db.patch(taskId, {
			energyBudget: {
				total: task.energyBudget.total + amount,
				available: task.energyBudget.available + amount,
			},
		});
	},
});

export const removeFunds = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		amount: z.bigint().min(0n),
	}),
	handler: async (ctx, { taskId, amount }) => {
		//
		const task = await findOne(ctx, { taskId });
		if (!task) throw NotFound();

		// create the transaction
		await addRefundTask(ctx, {
			taskId,
			owner: task.owner,
			value: { symbol: 'USD', amount },
			description: 'Refund of unused funds',
		});

		// update the task balance
		await ctx.db.patch(taskId, {
			energyBudget: {
				total: task.energyBudget.total - amount,
				available: task.energyBudget.available - amount,
			},
		});
	},
});

export const move = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		newParentId: zid('tasks').optional(),
	}),
	handler: async (ctx, { taskId, newParentId }) => {
		//
		return await ctx.db.patch(taskId, { parentId: newParentId });

		// TODO: forbid adding to itself
		// TODO: report to parents as well, old and new
	},
});

export const setPreferredIntelligence = defineMutation({
	args: z.object({
		taskId: zid('tasks'),
		preferredIntelligence: intelligenceKeys,
	}),
	handler: async (ctx, { taskId, preferredIntelligence }) => {
		//
		return await ctx.db.patch(taskId, { preferredIntelligence });
	},
});
