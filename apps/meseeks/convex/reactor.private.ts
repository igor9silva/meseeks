import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { authorSchema } from 'schemas/authorSchema';
import { actionResultSchema, actionStatusSchema, actionWarningSchema, costSchema } from 'schemas/actionSchema';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { addSettlementTransaction } from './transactions.private';

const interruptibleStatuses = ['pending authorization', 'enqueued', 'running'] as const;
const actionBaseSchema = z.object({
	owner: zid('users'),
	file: zid('files'),
	skillKey: z.string().min(1),
	args: z.record(z.unknown()),
	loopKey: z.string().min(1).optional(),
	intelligenceKey: z.string().min(1).optional(),
});
const recordActionResultSchema = z.object({
	result: actionResultSchema.optional(),
	patch: z.string().optional(),
});

type ActionBaseInput = z.output<typeof actionBaseSchema>;
type SettledActionStatus = 'succeeded' | 'failed' | 'skipped';

type ActionCause =
	| {
			kind: 'human';
			author: Id<'users'>;
	  }
	| {
			kind: 'reaction';
			previousActionId: Id<'actions'>;
	  }
	| {
			kind: 'trigger';
			triggerId: Id<'triggers'>;
	  }
	| {
			kind: 'authored';
			author: z.infer<typeof authorSchema>;
	  };

type ActionLifecycle =
	| {
			kind: 'enqueued';
	  }
	| {
			kind: 'settled';
			status: SettledActionStatus;
			result?: z.infer<typeof actionResultSchema>;
			patch?: string;
			costs?: Array<z.infer<typeof costSchema>>;
			settledAt?: number;
	  };

export const nextActionIndex = defineQuery({
	args: z.object({
		file: zid('files'),
	}),
	handler: async (ctx, { file }) => {
		//
		const latest = await ctx.db
			.query('actions')
			.withIndex('by_file_index', (q) => q.eq('file', file))
			.order('desc')
			.first();

		return latest ? latest.index + 1 : 0;
	},
});

export const enqueueHumanAction = defineMutation({
	args: actionBaseSchema.extend({
		author: zid('users'),
	}),
	handler: async (ctx, args) => {
		//
		return await insertAction(ctx, {
			...args,
			cause: {
				kind: 'human',
				author: args.author,
			},
			lifecycle: {
				kind: 'enqueued',
			},
		});
	},
});

export const enqueueReactionAction = defineMutation({
	args: actionBaseSchema.extend({
		previousActionId: zid('actions'),
	}),
	handler: async (ctx, args) => {
		//
		return await insertAction(ctx, {
			...args,
			cause: {
				kind: 'reaction',
				previousActionId: args.previousActionId,
			},
			lifecycle: {
				kind: 'enqueued',
			},
		});
	},
});

export const enqueueTriggerAction = defineMutation({
	args: actionBaseSchema.extend({
		triggerId: zid('triggers'),
	}),
	handler: async (ctx, args) => {
		//
		return await insertAction(ctx, {
			...args,
			cause: {
				kind: 'trigger',
				triggerId: args.triggerId,
			},
			lifecycle: {
				kind: 'enqueued',
			},
		});
	},
});

export const recordHumanAction = defineMutation({
	args: actionBaseSchema
		.extend({
			author: zid('users'),
			status: z.enum(['succeeded', 'failed', 'skipped']).default('succeeded'),
		})
		.merge(recordActionResultSchema),
	handler: async (ctx, args) => {
		//
		return await insertAction(ctx, {
			...args,
			cause: {
				kind: 'human',
				author: args.author,
			},
			lifecycle: {
				kind: 'settled',
				status: args.status,
				result: args.result,
				patch: args.patch,
			},
		});
	},
});

export const recordTriggerAction = defineMutation({
	args: actionBaseSchema
		.extend({
			triggerId: zid('triggers'),
			status: z.enum(['succeeded', 'failed', 'skipped']).default('succeeded'),
		})
		.merge(recordActionResultSchema),
	handler: async (ctx, args) => {
		//
		return await insertAction(ctx, {
			...args,
			cause: {
				kind: 'trigger',
				triggerId: args.triggerId,
			},
			lifecycle: {
				kind: 'settled',
				status: args.status,
				result: args.result,
				patch: args.patch,
			},
		});
	},
});

export const recordMutationAction = defineMutation({
	args: actionBaseSchema
		.pick({
			owner: true,
			file: true,
			skillKey: true,
			args: true,
		})
		.extend({
			author: authorSchema,
		})
		.merge(recordActionResultSchema),
	handler: async (ctx, args) => {
		//
		return await insertAction(ctx, {
			...args,
			cause: {
				kind: 'authored',
				author: args.author,
			},
			lifecycle: {
				kind: 'settled',
				status: 'succeeded',
				result: args.result,
				patch: args.patch,
			},
		});
	},
});

export const interruptFileWork = defineMutation({
	args: z.object({
		file: zid('files'),
		interruptedAt: z.number(),
	}),
	handler: async (ctx, { file, interruptedAt }) => {
		//
		let count = 0;

		for (const status of interruptibleStatuses) {
			const actions = await ctx.db
				.query('actions')
				.withIndex('by_file_status', (q) => q.eq('file', file).eq('status', status))
				.collect();

			for (const action of actions) {
				if (action.interruptedAt !== undefined) continue;
				await ctx.db.patch(action._id, { interruptedAt });
				count += 1;
			}
		}

		return count;
	},
});

export const claimAction = defineMutation({
	args: z.object({
		actionId: zid('actions'),
		expectedCost: z.bigint(),
		maxCost: z.bigint(),
	}),
	handler: async (ctx, { actionId, expectedCost, maxCost }) => {
		//
		const now = Date.now();
		const action = await ctx.db.get(actionId);
		if (!action) throw NotFound();

		if (isSettledStatus(action.status)) {
			return { status: 'settled' as const };
		}

		if (action.status === 'running') {
			return {
				status: 'already-running' as const,
				reservedBudget: action.reservedBudget ?? 0n,
			};
		}

		if (action.status === 'pending authorization') {
			return { status: 'pending-authorization' as const };
		}

		if (action.status !== 'enqueued') {
			return {
				status: 'not-claimable' as const,
				actionStatus: action.status,
			};
		}

		const causalParent = await findCausalParentAction(ctx, { action });
		if (causalParent && causalParent.settledAt === undefined) {
			return { status: 'waiting-for-cause' as const };
		}

		const file = await ctx.db.get(action.file);
		if (!file) throw NotFound();

		const budget = file.budget;
		if (maxCost > 0n && (!budget || budget.available < maxCost)) {
			await ctx.db.patch(actionId, {
				status: 'failed',
				expectedCost,
				maxCost,
				result: {
					text: 'Budget reservation failed.',
					files: [],
					metadata: {
						kind: 'budget',
						required: maxCost,
						available: budget?.available ?? 0n,
					},
				},
				settledAt: now,
			});

			return { status: 'budget-failed' as const };
		}

		if (budget && maxCost > 0n) {
			await ctx.db.patch(file._id, {
				budget: {
					...budget,
					available: budget.available - maxCost,
					reserved: budget.reserved + maxCost,
				},
				updatedAt: now,
			});
		}

		await ctx.db.patch(actionId, {
			status: 'running',
			expectedCost,
			maxCost,
			reservedBudget: maxCost,
			claimedAt: now,
			startedAt: now,
		});

		return { status: 'running' as const };
	},
});

export const settleAction = defineMutation({
	args: z.object({
		actionId: zid('actions'),
		status: z.enum(['succeeded', 'failed', 'skipped']),
		result: actionResultSchema.optional(),
		patch: z.string().optional(),
		costs: z.array(costSchema).default([]),
		warnings: z.array(actionWarningSchema).optional(),
		shouldReleaseAvailableBudget: z.boolean().default(false),
	}),
	handler: async (ctx, { actionId, status, result, patch, costs, warnings, shouldReleaseAvailableBudget }) => {
		//
		const now = Date.now();
		const action = await ctx.db.get(actionId);
		if (!action) throw NotFound();

		const file = await ctx.db.get(action.file);
		if (!file) throw NotFound();

		const actualCost = costs.reduce((total, cost) => total + cost.amount, 0n);
		const reservedBudget = action.reservedBudget ?? 0n;
		const budget = file.budget;
		const needsAttention = budget
			? settleFileBudget({ budget, reservedBudget, actualCost }).needsAttention
			: actualCost > 0n;
		const shouldReleaseAvailable = shouldReleaseAvailableBudget || shouldReleaseAvailableBudgetForResult(result);
		let releasedAvailableBudget = 0n;
		let patchToPersist = patch ?? action.patch;

		if (budget) {
			const settlement = settleFileBudget({ budget, reservedBudget, actualCost });
			const settledBudget = shouldReleaseAvailable
				? releaseAvailableBudget(settlement.budget)
				: settlement.budget;
			releasedAvailableBudget = settlement.budget.available - settledBudget.available;
			if (releasedAvailableBudget > 0n) {
				patchToPersist = combineActionPatches(patchToPersist, `~ budget -${releasedAvailableBudget}`);
			}

			await ctx.db.patch(file._id, {
				budget: settledBudget,
				updatedAt: now,
			});
		}

		if (actualCost > 0n) {
			await addSettlementTransaction(ctx, {
				owner: action.owner,
				file: action.file,
				action: actionId,
				value: {
					symbol: 'USD',
					amount: -actualCost,
				},
				description: `${action.skillKey} settlement`,
			});
			if (budget) {
				await releaseCommittedBudget(ctx, {
					owner: action.owner,
					amount: actualCost,
				});
			}
		}
		if (releasedAvailableBudget > 0n) {
			await releaseCommittedBudget(ctx, {
				owner: action.owner,
				amount: releasedAvailableBudget,
			});
		}

		await ctx.db.patch(actionId, {
			status,
			result: withAttentionMetadata(result, needsAttention),
			warnings,
			patch: patchToPersist,
			costs,
			settledAt: now,
		});

		return { needsAttention };
	},
});

export const latestActionForFile = defineQuery({
	args: z.object({
		file: zid('files'),
	}),
	handler: async (ctx, { file }) => {
		//
		return await ctx.db
			.query('actions')
			.withIndex('by_file_index', (q) => q.eq('file', file))
			.order('desc')
			.first();
	},
});

export const recentActionsForFile = defineQuery({
	args: z.object({
		file: zid('files'),
		limit: z.number().int().positive().max(100).default(20),
	}),
	handler: async (ctx, { file, limit }) => {
		//
		return await ctx.db
			.query('actions')
			.withIndex('by_file_index', (q) => q.eq('file', file))
			.order('desc')
			.take(limit);
	},
});

async function insertAction(
	ctx: MutationCtx,
	args: ActionBaseInput & {
		cause: ActionCause;
		lifecycle: ActionLifecycle;
	},
) {
	//
	const now = Date.now();
	const index = await nextActionIndex(ctx, { file: args.file });
	const causal = await deriveActionLineage(ctx, {
		owner: args.owner,
		file: args.file,
		loopKey: args.loopKey,
		cause: args.cause,
	});
	const status = args.lifecycle.kind === 'enqueued' ? 'enqueued' : args.lifecycle.status;
	const result = args.lifecycle.kind === 'enqueued' ? undefined : args.lifecycle.result;
	const patch = args.lifecycle.kind === 'enqueued' ? undefined : args.lifecycle.patch;
	const costs = args.lifecycle.kind === 'enqueued' ? [] : (args.lifecycle.costs ?? []);
	const settledAt = args.lifecycle.kind === 'enqueued' ? undefined : (args.lifecycle.settledAt ?? Date.now());

	const actionId = await ctx.db.insert('actions', {
		owner: args.owner,
		file: args.file,
		index,
		depth: causal.depth,
		author: causal.author,
		skillKey: args.skillKey,
		loopKey: args.loopKey,
		intelligenceKey: args.intelligenceKey,
		args: args.args,
		status,
		result,
		costs,
		patch,
		settledAt,
		createdAt: now,
	});

	await ctx.db.patch(actionId, { spark: causal.spark ?? actionId });

	return actionId;
}

async function deriveActionLineage(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		file: Id<'files'>;
		loopKey?: string;
		cause: ActionCause;
	},
): Promise<{
	author: z.infer<typeof authorSchema>;
	depth: number;
	spark: Id<'actions'> | undefined;
}> {
	//
	if (args.cause.kind === 'human') {
		return {
			author: args.cause.author,
			depth: 0,
			spark: undefined,
		};
	}

	if (args.cause.kind === 'reaction') {
		const previous = await ctx.db.get(args.cause.previousActionId);
		if (!previous) throw NotFound();
		if (previous.owner !== args.owner || previous.file !== args.file) throw NotFound();

		return {
			author: args.cause.previousActionId,
			depth: previous.depth + 1,
			spark: previous.spark ?? previous._id,
		};
	}

	if (args.cause.kind === 'trigger') {
		await ensureTriggerCanAuthorAction(ctx, {
			owner: args.owner,
			file: args.file,
			loopKey: args.loopKey,
			triggerId: args.cause.triggerId,
		});

		return {
			author: args.cause.triggerId,
			depth: 0,
			spark: undefined,
		};
	}

	const userId = zid('users').safeParse(args.cause.author);
	if (userId.success) {
		const user = await ctx.db.get(userId.data);
		if (user) {
			if (user._id !== args.owner) throw NotFound();

			return {
				author: args.cause.author,
				depth: 0,
				spark: undefined,
			};
		}
	}

	const parentActionId = zid('actions').safeParse(args.cause.author);
	if (parentActionId.success) {
		const previous = await ctx.db.get(parentActionId.data);
		if (!previous) throw NotFound();
		if (previous.owner !== args.owner || previous.file !== args.file) throw NotFound();

		return {
			author: args.cause.author,
			depth: previous.depth + 1,
			spark: previous.spark ?? previous._id,
		};
	}

	const triggerId = zid('triggers').safeParse(args.cause.author);
	if (triggerId.success) {
		await ensureTriggerCanAuthorAction(ctx, {
			owner: args.owner,
			file: args.file,
			loopKey: args.loopKey,
			triggerId: triggerId.data,
		});

		return {
			author: args.cause.author,
			depth: 0,
			spark: undefined,
		};
	}

	throw NotFound();
}

async function ensureTriggerCanAuthorAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		file: Id<'files'>;
		loopKey?: string;
		triggerId: Id<'triggers'>;
	},
) {
	//
	const trigger = await ctx.db.get(args.triggerId);
	if (!trigger) throw NotFound();

	if (trigger.kind === 'file') {
		if (trigger.owner !== args.owner || trigger.file !== args.file) throw NotFound();
		return;
	}

	const loop = await ctx.db.get(trigger.loop);
	if (!loop || loop.owner !== trigger.owner) throw NotFound();
	if (trigger.owner === args.owner) return;
	if (loop.isPublic === true && loop.key === args.loopKey) return;

	throw NotFound();
}

async function findCausalParentAction(
	ctx: MutationCtx,
	args: {
		action: Doc<'actions'>;
	},
): Promise<Doc<'actions'> | null | undefined> {
	//
	const parsedAuthor = zid('actions').safeParse(args.action.author);
	if (!parsedAuthor.success) return undefined;

	const candidate = await ctx.db.get(parsedAuthor.data);
	if (!candidate) return undefined;
	if (candidate.owner !== args.action.owner) return undefined;
	if (candidate.file !== args.action.file) return undefined;
	if (typeof candidate.index !== 'number') return undefined;
	if (typeof candidate.skillKey !== 'string') return undefined;
	if (!isActionStatus(candidate.status)) return undefined;

	return candidate;
}

function isSettledStatus(status: Doc<'actions'>['status']) {
	return status === 'succeeded' || status === 'failed' || status === 'skipped';
}

function isActionStatus(status: unknown): status is Doc<'actions'>['status'] {
	//
	return actionStatusSchema.safeParse(status).success;
}

function settleFileBudget(args: {
	budget: {
		total: bigint;
		available: bigint;
		reserved: bigint;
		spent: bigint;
	};
	reservedBudget: bigint;
	actualCost: bigint;
}) {
	//
	const { budget, reservedBudget, actualCost } = args;
	const reservedAfterRelease = budget.reserved >= reservedBudget ? budget.reserved - reservedBudget : 0n;
	const unusedReservation = reservedBudget > actualCost ? reservedBudget - actualCost : 0n;
	const overrun = actualCost > reservedBudget ? actualCost - reservedBudget : 0n;
	const availableWithRefund = budget.available + unusedReservation;
	const availableAfterOverrun = availableWithRefund >= overrun ? availableWithRefund - overrun : 0n;

	return {
		budget: {
			total: budget.total,
			available: availableAfterOverrun,
			reserved: reservedAfterRelease,
			spent: budget.spent + actualCost,
		},
		needsAttention: overrun > availableWithRefund,
	};
}

function releaseAvailableBudget(budget: { total: bigint; available: bigint; reserved: bigint; spent: bigint }) {
	//
	return {
		...budget,
		total: budget.total > budget.available ? budget.total - budget.available : 0n,
		available: 0n,
	};
}

function shouldReleaseAvailableBudgetForResult(result: z.infer<typeof actionResultSchema> | undefined) {
	//
	return result?.metadata?.['kind'] === 'seek' && result.metadata['seekState'] === 'done';
}

function combineActionPatches(...values: Array<string | undefined>) {
	//
	const patches = values.filter((value) => value && value.trim());

	return patches.join('\n') || undefined;
}

function withAttentionMetadata(result: z.infer<typeof actionResultSchema> | undefined, needsAttention: boolean) {
	//
	if (!needsAttention) return result;

	return {
		text: result?.text,
		files: result?.files ?? [],
		metadata: {
			...(result?.metadata ?? {}),
			needsAttention,
		},
	};
}

async function releaseCommittedBudget(ctx: MutationCtx, args: { owner: Id<'users'>; amount: bigint }) {
	//
	const user = await ctx.db.get(args.owner);
	if (!user) throw NotFound();

	const committed = user.committedBudgetUSD ?? 0n;
	await ctx.db.patch(args.owner, {
		committedBudgetUSD: committed > args.amount ? committed - args.amount : 0n,
	});
}
