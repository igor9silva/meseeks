import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { authorSchema } from 'schemas/authorSchema';
import { actionResultSchema, actionStatusSchema, actionWarningSchema, costSchema } from 'schemas/actionSchema';
import { env } from 'schemas/envSchema';
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
});

type ActionBaseInput = z.output<typeof actionBaseSchema>;
type ActionResult = z.infer<typeof actionResultSchema>;
type ActionResultFile = ActionResult['files'][number];
type ActionWarning = z.infer<typeof actionWarningSchema>;
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
			const result = {
				text: 'Budget reservation failed.',
				files: [],
				metadata: {
					kind: 'budget',
					required: maxCost,
					available: budget?.available ?? 0n,
				},
			};
			const materialized = await materializeActionResult(ctx, {
				action: {
					_id: actionId,
					owner: action.owner,
					file: action.file,
					index: action.index,
					skillKey: action.skillKey,
					status: 'failed',
				},
				status: 'failed',
				result,
				warnings: undefined,
				now,
			});
			if (materialized.resultFile) {
				await ctx.db.patch(actionId, {
					status: 'failed',
					expectedCost,
					maxCost,
					resultFile: materialized.resultFile.file,
					settledAt: now,
				});
			} else {
				await ctx.db.patch(actionId, {
					status: 'failed',
					expectedCost,
					maxCost,
					settledAt: now,
				});
			}
			await recordMutationDetail(ctx, {
				action: actionId,
				result: materialized.result,
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
		costs: z.array(costSchema).default([]),
		warnings: z.array(actionWarningSchema).optional(),
		shouldReleaseAvailableBudget: z.boolean().default(false),
	}),
	handler: async (ctx, { actionId, status, result, costs, warnings, shouldReleaseAvailableBudget }) => {
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

		if (budget) {
			const settlement = settleFileBudget({ budget, reservedBudget, actualCost });
			const settledBudget = shouldReleaseAvailable
				? releaseAvailableBudget(settlement.budget)
				: settlement.budget;
			releasedAvailableBudget = settlement.budget.available - settledBudget.available;

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

		const detailResult = withAttentionMetadata(result, needsAttention);
		const materialized = await materializeActionResult(ctx, {
			action: {
				_id: actionId,
				owner: action.owner,
				file: action.file,
				index: action.index,
				skillKey: action.skillKey,
				status,
			},
			status,
			result: detailResult,
			warnings,
			now,
		});
		if (materialized.resultFile) {
			await ctx.db.patch(actionId, {
				status,
				resultFile: materialized.resultFile.file,
				costs,
				settledAt: now,
			});
		} else {
			await ctx.db.patch(actionId, {
				status,
				costs,
				settledAt: now,
			});
		}

		if (materialized.result || warnings) {
			await recordMutationDetail(ctx, {
				action: actionId,
				result: materialized.result,
				costs,
				warnings,
			});
		}

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
		costs,
		settledAt,
		createdAt: now,
	});

	const materialized =
		args.lifecycle.kind === 'enqueued'
			? { result: undefined, resultFile: undefined }
			: await materializeActionResult(ctx, {
					action: {
						_id: actionId,
						owner: args.owner,
						file: args.file,
						index,
						skillKey: args.skillKey,
						status: args.lifecycle.status,
					},
					status: args.lifecycle.status,
					result,
					warnings: undefined,
					now,
				});

	if (materialized.resultFile) {
		await ctx.db.patch(actionId, {
			spark: causal.spark ?? actionId,
			resultFile: materialized.resultFile.file,
		});
	} else {
		await ctx.db.patch(actionId, { spark: causal.spark ?? actionId });
	}
	if (materialized.result) await recordMutationDetail(ctx, { action: actionId, result: materialized.result, costs });

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

async function materializeActionResult(
	ctx: MutationCtx,
	args: {
		action: {
			_id: Id<'actions'>;
			owner: Id<'users'>;
			file: Id<'files'>;
			index: number;
			skillKey: string;
			status: SettledActionStatus;
		};
		status: SettledActionStatus;
		result?: ActionResult;
		warnings?: ActionWarning[];
		now: number;
	},
) {
	//
	const content = renderActionResultContent({
		action: args.action,
		status: args.status,
		result: args.result,
		warnings: args.warnings,
	});
	const resultFile = await upsertActionResultFile(ctx, {
		action: args.action,
		content,
		now: args.now,
	});

	return {
		result: resultWithFile({
			result: args.result,
			resultFile,
			fallbackText: fallbackResultText({
				status: args.status,
				warnings: args.warnings,
			}),
		}),
		resultFile,
	};
}

async function upsertActionResultFile(
	ctx: MutationCtx,
	args: {
		action: {
			_id: Id<'actions'>;
			owner: Id<'users'>;
			file: Id<'files'>;
			index: number;
		};
		content: string;
		now: number;
	},
): Promise<ActionResultFile> {
	//
	const actionsDirectory = await findOrCreateActionResultChild(ctx, {
		owner: args.action.owner,
		parent: args.action.file,
		name: 'actions',
		author: args.action._id,
		now: args.now,
	});
	const actionDirectoryName = String(args.action.index).padStart(6, '0');
	const actionDirectory = await findOrCreateActionResultChild(ctx, {
		owner: args.action.owner,
		parent: actionsDirectory,
		name: actionDirectoryName,
		author: args.action._id,
		now: args.now,
	});
	const resultFile = await findOrCreateActionResultChild(ctx, {
		owner: args.action.owner,
		parent: actionDirectory,
		name: 'result.mdx',
		author: args.action._id,
		now: args.now,
	});
	const fitted = fitInlineResultContent(args.content);
	const contentId = await ctx.db.insert('file_contents', {
		owner: args.action.owner,
		file: resultFile,
		author: args.action._id,
		text: fitted.text,
		createdAt: args.now,
	});

	await ctx.db.patch(resultFile, {
		currentContent: {
			kind: 'text',
			content: contentId,
		},
		updatedAt: args.now,
	});

	return {
		file: resultFile,
		path: `actions/${actionDirectoryName}/result.mdx`,
		size: fitted.size,
		contentType: 'text/mdx',
	};
}

async function findOrCreateActionResultChild(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		parent: Id<'files'>;
		name: string;
		author: Id<'actions'>;
		now: number;
	},
) {
	//
	const existing = await ctx.db
		.query('files')
		.withIndex('by_owner_parent_name', (q) =>
			q
				.eq('owner', args.owner) //
				.eq('parent', args.parent)
				.eq('name', args.name),
		)
		.unique();

	if (existing) return existing._id;

	return await ctx.db.insert('files', {
		owner: args.owner,
		parent: args.parent,
		name: args.name,
		author: args.author,
		createdAt: args.now,
		updatedAt: args.now,
	});
}

function renderActionResultContent(args: {
	action: {
		index: number;
		skillKey: string;
	};
	status: SettledActionStatus;
	result?: ActionResult;
	warnings?: ActionWarning[];
}) {
	//
	const parts = [`# ${args.action.skillKey}()`, `Action ${args.action.index}`, `Status: ${args.status}`];

	if (args.result?.text) {
		parts.push(args.result.text);
	} else {
		parts.push(fallbackResultText({ status: args.status, warnings: args.warnings }));
	}

	if (args.warnings && args.warnings.length > 0) {
		parts.push(renderWarnings(args.warnings));
	}

	if (args.result?.files.length) {
		parts.push(renderResultFiles(args.result.files));
	}

	return parts.join('\n\n').trimEnd() + '\n';
}

function renderWarnings(warnings: ActionWarning[]) {
	//
	const lines = ['## Warnings'];
	for (const warning of warnings) {
		lines.push(`- ${warning.severity}: ${warning.message}`);
	}

	return lines.join('\n');
}

function renderResultFiles(files: ActionResultFile[]) {
	//
	const lines = ['## Files'];
	for (const file of files) {
		lines.push(`- ${file.path} (${file.file})`);
	}

	return lines.join('\n');
}

function fallbackResultText(args: { status: SettledActionStatus; warnings?: ActionWarning[] }) {
	//
	if (args.warnings && args.warnings.length > 0) return args.warnings[0].message;

	return `Action ${args.status}.`;
}

function resultWithFile(args: {
	result?: ActionResult;
	resultFile: ActionResultFile;
	fallbackText: string;
}): ActionResult {
	//
	const files = [args.resultFile].concat(
		(args.result?.files ?? []).filter((file) => file.file !== args.resultFile.file),
	);
	const text = args.result?.text ?? args.fallbackText;

	if (args.result?.metadata !== undefined) {
		return {
			text,
			files,
			metadata: args.result.metadata,
		};
	}

	return {
		text,
		files,
	};
}

function fitInlineResultContent(text: string) {
	//
	const encoder = new TextEncoder();
	const original = encoder.encode(text);
	if (original.byteLength <= env.MAX_REACTOR_INLINE_CONTENT_BYTES) {
		return {
			text,
			size: original.byteLength,
		};
	}

	const notice = '\n\nResult truncated because it exceeded the inline result file limit.\n';
	let fittedText = text;
	while (
		encoder.encode(fittedText + notice).byteLength > env.MAX_REACTOR_INLINE_CONTENT_BYTES &&
		fittedText.length > 0
	) {
		fittedText = fittedText.slice(0, Math.floor(fittedText.length * 0.8));
	}
	const truncated = fittedText + notice;

	return {
		text: truncated,
		size: encoder.encode(truncated).byteLength,
	};
}

function canonicalResultFile(result: z.infer<typeof actionResultSchema> | undefined) {
	//
	return result?.files[0]?.file;
}

async function recordMutationDetail(
	ctx: MutationCtx,
	args: {
		action: Id<'actions'>;
		result?: z.infer<typeof actionResultSchema>;
		costs?: Array<z.infer<typeof costSchema>>;
		warnings?: Array<z.infer<typeof actionWarningSchema>>;
	},
) {
	//
	const now = Date.now();
	const kind = z.literal('mutation').parse('mutation');
	const existing = await ctx.db
		.query('details')
		.withIndex('by_action', (q) => q.eq('action', args.action))
		.first();
	if (existing?.kind === 'model') {
		await ctx.db.patch(existing._id, {
			metadata: args.result?.metadata,
			costs: args.costs ?? existing.costs,
			warnings: args.warnings,
			updatedAt: now,
		});
		return existing._id;
	}
	if (existing?.kind === 'request' || existing?.kind === 'execution') {
		await ctx.db.patch(existing._id, {
			costs: args.costs ?? existing.costs,
			warnings: args.warnings,
			updatedAt: now,
		});
		return existing._id;
	}
	if (existing && existing.kind !== 'mutation') {
		await ctx.db.delete(existing._id);
	}

	const value = {
		kind,
		action: args.action,
		summary: args.result?.text ?? args.warnings?.[0]?.message ?? 'Action settled.',
		resultFile: canonicalResultFile(args.result),
		metadata: args.result?.metadata,
		warnings: args.warnings,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	};

	if (existing?.kind === 'mutation') {
		await ctx.db.patch(existing._id, value);
		return existing._id;
	}

	return await ctx.db.insert('details', value);
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
