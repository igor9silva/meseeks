import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { NotFound } from 'lib/errors';
import { mutation, query } from 'lib/convex';
import { actionResultSchema, costSchema } from 'schemas/actionSchema';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import {
	adjustFileBudget,
	clearFileTag,
	createFile,
	ensureFileOwner,
	moveFile,
	releaseAvailableFileBudget,
	setFileTags,
	writeFileContent,
} from './files.private';
import { createLoop, resolveLoop } from './loops.private';
import {
	claimAction,
	enqueueHumanAction,
	recordHumanAction,
	recordMutationAction,
	interruptFileWork,
	recentActionsForFile,
	settleAction,
} from './reactor.private';
import { upsertRoute } from './routes.private';
import { TRIGGER_MAX_USES_UNLIMITED, upsertFileTrigger, upsertLoopTrigger } from './triggers.private';
import { getCurrentUser } from './users.private';

const enqueuedSkillSchema = z.object({
	skillKey: z.string().min(1),
	args: z.record(z.unknown()).default({}),
	source: z.string().optional(),
});
const tagUpdatesSchema = z.array(
	z.object({
		key: z.string().min(1),
		value: z.string(),
	}),
);
const createFileSkillArgsSchema = z.object({
	parent: zid('files').optional(),
	name: z.string().min(1),
	content: z.string().optional(),
	tags: tagUpdatesSchema.default([]),
	shouldAddInboxTag: z.boolean().default(true),
});
const loopVisualSkillArgsSchema = z
	.object({
		icon: z.string().min(1),
		color: z.string().min(1),
		tint: z.string().min(1),
	})
	.default({
		icon: 'circle',
		color: 'zinc',
		tint: 'zinc',
	});
const createLoopSkillArgsSchema = z.object({
	key: z.string().min(1),
	name: z.string().min(1),
	description: z.string().default(''),
	defaultIntelligenceKey: z.string().min(1).optional(),
	visual: loopVisualSkillArgsSchema,
});
const createTriggerSkillArgsSchema = z.union([
	z.object({
		kind: z.literal('file'),
		file: zid('files').optional(),
		handler: zid('files'),
		maxUses: z.number().int().nonnegative().default(TRIGGER_MAX_USES_UNLIMITED),
	}),
	z.object({
		kind: z.literal('loop'),
		loop: zid('loops'),
		handler: zid('files'),
		maxUses: z.number().int().nonnegative().default(TRIGGER_MAX_USES_UNLIMITED),
	}),
]);
const createRouteSkillArgsSchema = z.object({
	slug: z.string().min(1),
	file: zid('files'),
	defaultFile: zid('files').optional(),
});
export const act = mutation({
	args: {
		fileId: zid('files'),
		skills: z.array(enqueuedSkillSchema).min(1),
		loopKey: z.string().min(1).nullable().optional(),
		intelligence: z.string().min(1).optional(),
		shouldReopen: z.boolean().optional(),
	},
	handler: async (ctx, { fileId, skills, loopKey, intelligence, shouldReopen }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, { fileId: fileId, owner: currentUser._id });

		return await createActionsForFile(ctx, {
			owner: currentUser._id,
			file: fileId,
			skills,
			loopKey: loopKey ?? undefined,
			intelligenceKey: intelligence,
			shouldReopen,
		});
	},
});

export const claim = mutation({
	args: {
		actionId: zid('actions'),
		expectedCost: z.bigint(),
		maxCost: z.bigint(),
	},
	handler: async (ctx, args) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const action = await ctx.db.get(args.actionId);
		if (!action || action.owner !== currentUser._id) throw NotFound();
		await ensureFileOwner(ctx, {
			fileId: action.file,
			owner: currentUser._id,
		});

		return await claimAction(ctx, args);
	},
});

export const settle = mutation({
	args: {
		actionId: zid('actions'),
		status: z.enum(['succeeded', 'failed', 'skipped']),
		result: actionResultSchema.optional(),
		costs: z.array(costSchema).default([]),
	},
	handler: async (ctx, args) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const action = await ctx.db.get(args.actionId);
		if (!action || action.owner !== currentUser._id) throw NotFound();
		await ensureFileOwner(ctx, {
			fileId: action.file,
			owner: currentUser._id,
		});

		const settled = await settleAction(ctx, args);
		await evaluateReactionTriggers(ctx, { actionId: args.actionId });

		return settled;
	},
});

export const recent = query({
	args: {
		file: zid('files'),
		limit: z.number().int().positive().max(100).default(25),
	},
	handler: async (ctx, { file, limit }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, { fileId: file, owner: currentUser._id });

		return await recentActionsForFile(ctx, { file, limit });
	},
});

export const findAllPaginated = query({
	args: {
		fileId: zid('files'),
		paginationOpts: paginationOptionsSchema,
	},
	handler: async (ctx, { fileId, paginationOpts }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, { fileId: fileId, owner: currentUser._id });

		return await ctx.db
			.query('actions')
			.withIndex('by_file_index', (q) => q.eq('file', fileId))
			.order('desc')
			.paginate(paginationOpts);
	},
});

export const findDetails = query({
	args: {
		actionId: zid('actions'),
	},
	handler: async (ctx, { actionId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const action = await ctx.db.get(actionId);
		if (!action || action.owner !== currentUser._id) return undefined;

		const details = await ctx.db
			.query('details')
			.withIndex('by_action', (q) => q.eq('action', actionId))
			.unique();

		return {
			action,
			details,
		};
	},
});

export const authorize = mutation({
	args: {
		fileId: zid('files'),
		actionId: zid('actions'),
		hasApproved: z.boolean(),
	},
	handler: async (ctx, { fileId, actionId, hasApproved }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, { fileId: fileId, owner: currentUser._id });
		const action = await ctx.db.get(actionId);
		if (!action || action.owner !== currentUser._id || action.file !== fileId) throw NotFound();

		if (!hasApproved) {
			await ctx.db.patch(actionId, {
				status: 'skipped',
				settledAt: Date.now(),
			});
			return;
		}

		await ctx.db.patch(actionId, {
			status: 'enqueued',
			authorizedAt: Date.now(),
		});
		await ctx.scheduler.runAfter(0, internal.runtime._perform, {
			owner: currentUser._id,
			actionId,
		});
	},
});

export async function createActionsForFile(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		file: Id<'files'>;
		skills: Array<z.infer<typeof enqueuedSkillSchema>>;
		loopKey?: string;
		intelligenceKey?: string;
		shouldReopen?: boolean;
	},
) {
	//
	if (args.shouldReopen) {
		await setFileTags(ctx, {
			owner: args.owner,
			file: args.file,
			author: args.owner,
			tags: [
				{ key: 'kind', value: 'task' },
				{ key: 'status', value: 'active' },
			],
			actionSkill: 'updateFileMetadata',
		});
	}

	const actionIds: Id<'actions'>[] = [];

	for (const skill of args.skills) {
		const actionId = await createActionForSkillRequest(ctx, {
			owner: args.owner,
			file: args.file,
			skill,
			loopKey: args.loopKey,
			intelligenceKey: args.intelligenceKey,
		});
		if (actionId) actionIds.push(actionId);
	}

	return actionIds;
}

async function createActionForSkillRequest(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		file: Id<'files'>;
		skill: z.infer<typeof enqueuedSkillSchema>;
		loopKey?: string;
		intelligenceKey?: string;
	},
) {
	//
	if (args.skill.skillKey === 'say') {
		const text = stringArg(args.skill.args, 'message') ?? stringArg(args.skill.args, 'text') ?? '';
		if (!text.trim()) return undefined;

		return await createSayAction(ctx, {
			owner: args.owner,
			file: args.file,
			author: args.owner,
			text,
			loopKey: args.loopKey,
			intelligenceKey: args.intelligenceKey,
			shouldEvaluateTriggers: true,
		});
	}

	if (args.skill.skillKey === 'createFile') {
		const parsed = createFileSkillArgsSchema.safeParse(args.skill.args);
		if (!parsed.success) {
			return await recordFailedSkillAction(ctx, {
				owner: args.owner,
				file: args.file,
				author: args.owner,
				skillKey: args.skill.skillKey,
				actionArgs: args.skill.args,
				message: 'createFile arguments are invalid.',
			});
		}

		const fileId = await createFile(ctx, {
			owner: args.owner,
			parent: parsed.data.parent ?? args.file,
			name: parsed.data.name,
			author: args.owner,
			content: parsed.data.content,
			tags: parsed.data.tags,
			shouldAddInboxTag: parsed.data.shouldAddInboxTag,
			shouldCreateAction: false,
		});

		return await recordMutationAction(ctx, {
			owner: args.owner,
			file: args.file,
			author: args.owner,
			skillKey: 'createFile',
			args: args.skill.args,
			result: {
				text: `Created ${parsed.data.name}.`,
				files: [
					{
						file: fileId,
						path: parsed.data.name,
					},
				],
			},
		});
	}

	if (args.skill.skillKey === 'updateBudget') {
		const amount = bigintArg(args.skill.args, 'amount') ?? 0n;
		await adjustFileBudget(ctx, {
			owner: args.owner,
			file: args.file,
			author: args.owner,
			amount,
		});
		return undefined;
	}

	if (args.skill.skillKey === 'createLoop') {
		const parsed = createLoopSkillArgsSchema.safeParse(args.skill.args);
		if (!parsed.success) {
			return await recordFailedSkillAction(ctx, {
				owner: args.owner,
				file: args.file,
				author: args.owner,
				skillKey: args.skill.skillKey,
				actionArgs: args.skill.args,
				message: 'createLoop arguments are invalid.',
			});
		}

		const created = await createLoop(ctx, {
			owner: args.owner,
			author: args.owner,
			auditFile: args.file,
			...parsed.data,
		});
		return created.actionId;
	}

	if (args.skill.skillKey === 'createTrigger') {
		const parsed = createTriggerSkillArgsSchema.safeParse(args.skill.args);
		if (!parsed.success) {
			return await recordFailedSkillAction(ctx, {
				owner: args.owner,
				file: args.file,
				author: args.owner,
				skillKey: args.skill.skillKey,
				actionArgs: args.skill.args,
				message: 'createTrigger arguments are invalid.',
			});
		}

		if (parsed.data.kind === 'file') {
			await upsertFileTrigger(ctx, {
				owner: args.owner,
				author: args.owner,
				file: parsed.data.file ?? args.file,
				handler: parsed.data.handler,
				maxUses: parsed.data.maxUses,
				auditFile: args.file,
			});
			return undefined;
		}

		await upsertLoopTrigger(ctx, {
			owner: args.owner,
			author: args.owner,
			loop: parsed.data.loop,
			handler: parsed.data.handler,
			maxUses: parsed.data.maxUses,
			auditFile: args.file,
		});
		return undefined;
	}

	if (args.skill.skillKey === 'createRoute') {
		const parsed = createRouteSkillArgsSchema.safeParse(args.skill.args);
		if (!parsed.success) {
			return await recordFailedSkillAction(ctx, {
				owner: args.owner,
				file: args.file,
				author: args.owner,
				skillKey: args.skill.skillKey,
				actionArgs: args.skill.args,
				message: 'createRoute arguments are invalid.',
			});
		}

		await upsertRoute(ctx, {
			owner: args.owner,
			author: args.owner,
			slug: parsed.data.slug,
			file: parsed.data.file,
			defaultFile: parsed.data.defaultFile,
		});
		return undefined;
	}

	if (args.skill.skillKey === 'updateFileContent') {
		const content = stringArg(args.skill.args, 'content');
		if (content === undefined) return undefined;

		const summary = await writeFileContent(ctx, {
			fileId: args.file,
			owner: args.owner,
			author: args.owner,
			content,
			shouldCreateAction: false,
		});
		await recordMutationAction(ctx, {
			owner: args.owner,
			file: args.file,
			author: args.owner,
			skillKey: 'updateFileContent',
			args: args.skill.args,
			result: {
				text: summary,
				files: [
					{
						file: args.file,
						path: 'index.md',
					},
				],
			},
		});
		return undefined;
	}

	if (args.skill.skillKey === 'rename' || args.skill.skillKey === 'move') {
		const name = stringArg(args.skill.args, 'name');
		const parsedParent = zid('files').safeParse(args.skill.args['parent']);
		if (!name && !parsedParent.success) return undefined;

		const summary = await moveFile(ctx, {
			fileId: args.file,
			owner: args.owner,
			author: args.owner,
			newParent: parsedParent.success ? parsedParent.data : undefined,
			newName: name ? name.slice(0, 60).trim() : undefined,
			shouldCreateAction: false,
		});
		await recordMutationAction(ctx, {
			owner: args.owner,
			file: args.file,
			author: args.owner,
			skillKey: 'move',
			args: args.skill.args,
			result: {
				text: summary,
				files: [
					{
						file: args.file,
						path: summary,
					},
				],
			},
		});
		return undefined;
	}

	if (args.skill.skillKey === 'tag') {
		const key = stringArg(args.skill.args, 'key');
		if (!key) return undefined;

		const value = stringArg(args.skill.args, 'value');
		let summary: string;
		if (value === undefined) {
			summary = await clearFileTag(ctx, {
				owner: args.owner,
				file: args.file,
				author: args.owner,
				key,
				actionSkill: 'tag',
				shouldCreateAction: false,
			});
		} else {
			summary = await setFileTags(ctx, {
				owner: args.owner,
				file: args.file,
				author: args.owner,
				tags: [{ key, value }],
				actionSkill: 'tag',
				shouldCreateAction: false,
			});
		}
		if (!summary) return undefined;

		await recordMutationAction(ctx, {
			owner: args.owner,
			file: args.file,
			author: args.owner,
			skillKey: 'tag',
			args: args.skill.args,
			result: {
				text: summary,
				files: [],
			},
		});
		return undefined;
	}

	if (args.skill.skillKey === 'updateFileMetadata') {
		const name = stringArg(args.skill.args, 'name');
		const parsedTags = tagUpdatesSchema.safeParse(args.skill.args['tags']);
		const summaries = [];

		if (name) {
			const summary = await moveFile(ctx, {
				fileId: args.file,
				owner: args.owner,
				author: args.owner,
				newName: name.slice(0, 60).trim(),
				shouldCreateAction: false,
			});
			summaries.push(summary);
		}
		if (parsedTags.success && parsedTags.data.length > 0) {
			const summary = await setFileTags(ctx, {
				owner: args.owner,
				file: args.file,
				author: args.owner,
				tags: parsedTags.data,
				actionSkill: 'updateFileMetadata',
				shouldCreateAction: false,
			});
			if (summary) summaries.push(summary);

			if (shouldReleaseBudgetForTags(parsedTags.data)) {
				const budgetSummary = await releaseAvailableFileBudget(ctx, {
					owner: args.owner,
					file: args.file,
					author: args.owner,
					actionSkill: 'updateFileMetadata',
					shouldCreateAction: false,
				});
				if (budgetSummary) summaries.push(budgetSummary);
			}
		}
		if (summaries.length === 0) return undefined;

		await recordMutationAction(ctx, {
			owner: args.owner,
			file: args.file,
			author: args.owner,
			skillKey: 'updateFileMetadata',
			args: args.skill.args,
			result: {
				text: summaries.join('\n'),
				files: [],
			},
		});
		return undefined;
	}

	if (args.skill.skillKey === 'interrupt') {
		await interruptFileWork(ctx, { file: args.file, interruptedAt: Date.now() });
		return await recordMutationAction(ctx, {
			owner: args.owner,
			file: args.file,
			author: args.owner,
			skillKey: 'interrupt',
			args: {},
			result: {
				text: 'Interrupted older work.',
				files: [],
			},
		});
	}

	return await enqueueRuntimeAction(ctx, {
		owner: args.owner,
		file: args.file,
		author: args.owner,
		skillKey: args.skill.skillKey,
		actionArgs: args.skill.args,
		loopKey: args.loopKey,
		intelligenceKey: args.intelligenceKey,
	});
}

async function createSayAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		file: Id<'files'>;
		author: Id<'users'>;
		text: string;
		loopKey?: string;
		intelligenceKey?: string;
		shouldEvaluateTriggers: boolean;
	},
) {
	//
	await interruptFileWork(ctx, { file: args.file, interruptedAt: Date.now() });

	const resolvedLoop = args.loopKey
		? await resolveLoop(ctx, { owner: args.owner, loopKey: args.loopKey })
		: undefined;
	const actionArgs: Record<string, unknown> = { text: args.text, message: args.text };
	const actionId = await recordHumanAction(ctx, {
		owner: args.owner,
		file: args.file,
		author: args.author,
		skillKey: 'say',
		loopKey: resolvedLoop?.key,
		intelligenceKey: args.intelligenceKey,
		args: actionArgs,
		result: {
			text: args.text,
			files: [],
		},
	});

	if (args.shouldEvaluateTriggers) await evaluateReactionTriggers(ctx, { actionId });

	return actionId;
}

async function evaluateReactionTriggers(
	ctx: MutationCtx,
	args: {
		actionId: Id<'actions'>;
	},
) {
	//
	const action = await ctx.db.get(args.actionId);
	if (!action || action.status !== 'succeeded') return;
	if (action.interruptedAt !== undefined) return;

	await ctx.scheduler.runAfter(0, internal.triggerIsolate._evaluate, {
		owner: action.owner,
		actionId: args.actionId,
	});
}

async function enqueueRuntimeAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		file: Id<'files'>;
		author: Id<'users'>;
		skillKey: string;
		actionArgs: Record<string, unknown>;
		loopKey?: string;
		intelligenceKey?: string;
	},
) {
	//
	const resolvedLoop = args.loopKey
		? await resolveLoop(ctx, { owner: args.owner, loopKey: args.loopKey })
		: undefined;
	const actionId = await enqueueHumanAction(ctx, {
		owner: args.owner,
		file: args.file,
		author: args.author,
		skillKey: args.skillKey,
		args: args.actionArgs,
		loopKey: resolvedLoop?.key,
		intelligenceKey: args.intelligenceKey,
	});

	await ctx.scheduler.runAfter(0, internal.runtime._perform, {
		owner: args.owner,
		actionId,
	});

	return actionId;
}

function stringArg(args: Record<string, unknown>, key: string) {
	//
	const value = args[key];
	return typeof value === 'string' ? value : undefined;
}

function bigintArg(args: Record<string, unknown>, key: string) {
	//
	const value = args[key];
	return typeof value === 'bigint' ? value : undefined;
}

async function recordFailedSkillAction(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		file: Id<'files'>;
		author: Id<'users'>;
		skillKey: string;
		actionArgs: Record<string, unknown>;
		message: string;
	},
) {
	//
	return await recordHumanAction(ctx, {
		owner: args.owner,
		file: args.file,
		author: args.author,
		skillKey: args.skillKey,
		args: args.actionArgs,
		status: 'failed',
		result: {
			text: args.message,
			files: [],
		},
	});
}

function shouldReleaseBudgetForTags(tags: z.infer<typeof tagUpdatesSchema>) {
	//
	for (const tag of tags) {
		if (tag.key !== 'status') continue;
		if (tag.value === 'done' || tag.value === 'discarded') return true;
	}

	return false;
}
