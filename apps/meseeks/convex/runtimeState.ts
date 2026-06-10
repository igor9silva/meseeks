import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internalMutation, internalQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { actionResultFileSchema, actionResultSchema, actionWarningSchema, costSchema } from 'schemas/actionSchema';
import { objectContentPointerSchema } from 'schemas/fileSchema';
import {
	createFile,
	ensureFileOwner,
	findChildByName,
	findTags,
	moveFile,
	renderCurrentContent,
	setFileTags,
	writeFileContent,
} from './files.private';
import { findLoopByKey } from './loops.private';
import { claimAction, recentActionsForFile, settleAction } from './reactor.private';
import { resolveSkillForRuntime } from './skills.private';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

const recordedSandboxOutputSchema = z.union([
	z.object({
		path: z.string().min(1),
		content: z.string(),
		size: z.number().int().nonnegative(),
		contentType: z.string().min(1).optional(),
	}),
	z.object({
		path: z.string().min(1),
		pointer: objectContentPointerSchema,
		size: z.number().int().nonnegative(),
		contentType: z.string().min(1).optional(),
	}),
]);
const planMutationSchema = z.object({
	title: z.string().min(1).max(60).optional(),
	body: z.string().min(1).optional(),
	tags: z
		.array(
			z.object({
				key: z.string().min(1),
				value: z.string(),
			}),
		)
		.default([]),
	shouldRemoveInboxTag: z.boolean().default(true),
	note: z.string().min(1).optional(),
});
const seekStateSchema = z.enum(['continue', 'done', 'blocked']);
const iterationMutationSchema = z.object({
	body: z.string().min(1).optional(),
	tags: z
		.array(
			z.object({
				key: z.string().min(1),
				value: z.string(),
			}),
		)
		.default([]),
	state: seekStateSchema,
	note: z.string().min(1).optional(),
});

export const _context = internalQuery({
	args: {
		owner: zid('users'),
		actionId: zid('actions'),
	},
	handler: async (ctx, { owner, actionId }) => {
		//
		const action = await ctx.db.get(actionId);
		if (!action || action.owner !== owner) throw NotFound();
		const file = await ensureFileOwner(ctx, {
			fileId: action.file,
			owner,
		});
		const tags = await findTags(ctx, {
			file: action.file,
			owner,
		});
		const recentActions = await recentActionsForFile(ctx, {
			file: action.file,
			limit: 20,
		});
		const loop = action.loopKey
			? await findLoopByKey(ctx, {
					owner,
					key: action.loopKey,
				})
			: undefined;

		return {
			action,
			skill: await resolveSkillForRuntime(ctx, {
				owner,
				skillKey: action.skillKey,
			}),
			loop,
			file,
			tags,
			content: await renderCurrentContent(ctx, { file }),
			recentActions,
		};
	},
});

export const _claim = internalMutation({
	args: {
		owner: zid('users'),
		actionId: zid('actions'),
		expectedCost: z.bigint(),
		maxCost: z.bigint(),
	},
	handler: async (ctx, { owner, actionId, expectedCost, maxCost }) => {
		//
		const action = await ctx.db.get(actionId);
		if (!action || action.owner !== owner) throw NotFound();

		return await claimAction(ctx, {
			actionId,
			expectedCost,
			maxCost,
		});
	},
});

export const _upsertDetails = internalMutation({
	args: {
		owner: zid('users'),
		actionId: zid('actions'),
		skill: zid('skills').optional(),
		skillFile: zid('files').optional(),
		loop: zid('loops').optional(),
		provider: z.string().min(1).optional(),
		model: z.string().min(1).optional(),
		instructions: z.string().optional(),
		input: z.unknown().optional(),
		output: z.unknown().optional(),
		usage: z.unknown().optional(),
		result: actionResultSchema.optional(),
		costs: z.array(costSchema).optional(),
		warnings: z.array(actionWarningSchema).optional(),
	},
	handler: async (ctx, { owner, actionId, ...value }) => {
		//
		const action = await ctx.db.get(actionId);
		if (!action || action.owner !== owner) throw NotFound();
		const now = Date.now();
		const existing = await ctx.db
			.query('details')
			.withIndex('by_action', (q) => q.eq('action', actionId))
			.unique();

		const detail = detailForRuntimeValue({
			actionId,
			value,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
		});

		if (existing) {
			await ctx.db.patch(existing._id, detail);
			return existing._id;
		}

		return await ctx.db.insert('details', detail);
	},
});

function detailForRuntimeValue(args: {
	actionId: Id<'actions'>;
	value: {
		skill?: Id<'skills'>;
		skillFile?: Id<'files'>;
		loop?: Id<'loops'>;
		provider?: string;
		model?: string;
		instructions?: string;
		input?: unknown;
		output?: unknown;
		usage?: unknown;
		result?: z.infer<typeof actionResultSchema>;
		costs?: Array<z.infer<typeof costSchema>>;
		warnings?: Array<z.infer<typeof actionWarningSchema>>;
	};
	createdAt: number;
	updatedAt: number;
}) {
	//
	if (args.value.provider && args.value.model) {
		return {
			kind: z.literal('model').parse('model'),
			action: args.actionId,
			skill: args.value.skill,
			skillFile: args.value.skillFile,
			provider: args.value.provider,
			model: args.value.model,
			input: args.value.input,
			output: args.value.output,
			metadata: args.value.result?.metadata,
			usage: args.value.usage,
			costs: args.value.costs ?? [],
			warnings: args.value.warnings,
			createdAt: args.createdAt,
			updatedAt: args.updatedAt,
		};
	}

	if (args.value.provider === 'daytona') {
		return {
			kind: z.literal('execution').parse('execution'),
			action: args.actionId,
			skill: args.value.skill,
			skillFile: args.value.skillFile,
			outputFiles: args.value.result?.files.map((file) => file.file) ?? [],
			costs: args.value.costs ?? [],
			warnings: args.value.warnings,
			createdAt: args.createdAt,
			updatedAt: args.updatedAt,
		};
	}

	return {
		kind: z.literal('mutation').parse('mutation'),
		action: args.actionId,
		skill: args.value.skill,
		summary: args.value.result?.text ?? args.value.warnings?.[0]?.message ?? 'Action settled.',
		resultFile: args.value.result?.files[0]?.file,
		metadata: args.value.result?.metadata,
		warnings: args.value.warnings,
		createdAt: args.createdAt,
		updatedAt: args.updatedAt,
	};
}

export const _settle = internalMutation({
	args: {
		owner: zid('users'),
		actionId: zid('actions'),
		status: z.enum(['succeeded', 'failed', 'skipped']),
		result: actionResultSchema.optional(),
		costs: z.array(costSchema).default([]),
		warnings: z.array(actionWarningSchema).optional(),
	},
	handler: async (ctx, { owner, ...args }) => {
		//
		const action = await ctx.db.get(args.actionId);
		if (!action || action.owner !== owner) throw NotFound();

		await applyPlanMutation(ctx, {
			owner,
			actionId: args.actionId,
			result: args.result,
		});
		await applyIterationMutation(ctx, {
			owner,
			actionId: args.actionId,
			result: args.result,
		});
		const settled = await settleAction(ctx, {
			...args,
			shouldReleaseAvailableBudget: shouldReleaseAvailableBudgetOnSettle(args.result),
		});
		await applySettledResultState(ctx, {
			owner,
			actionId: args.actionId,
			result: args.result,
		});

		return settled;
	},
});

async function applyPlanMutation(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		actionId: Id<'actions'>;
		result: z.infer<typeof actionResultSchema> | undefined;
	},
) {
	//
	const mutation = planMutationFromResult(args.result);
	if (!mutation) return undefined;

	const action = await ctx.db.get(args.actionId);
	if (!action || action.owner !== args.owner || action.skillKey !== 'plan') throw NotFound();

	const file = await ensureFileOwner(ctx, {
		fileId: action.file,
		owner: args.owner,
	});

	if (mutation.title && mutation.title !== file.name) {
		await moveFile(ctx, {
			fileId: action.file,
			owner: args.owner,
			author: args.actionId,
			newName: mutation.title,
			shouldCreateAction: false,
		});
	}

	if (mutation.body !== undefined) {
		const current = await renderCurrentContent(ctx, { file });
		const body = sanitizeInternalIdLeaks({
			text: mutation.body,
			allowedInternalIdText: current,
		});
		if (body.trim() && current !== body) {
			await writeFileContent(ctx, {
				fileId: action.file,
				owner: args.owner,
				author: args.actionId,
				content: body,
				shouldCreateAction: false,
			});
		}
	}

	if (mutation.tags.length > 0 || mutation.shouldRemoveInboxTag) {
		await setFileTags(ctx, {
			owner: args.owner,
			file: action.file,
			author: args.actionId,
			tags: mutation.tags,
			shouldRemoveInboxTag: mutation.shouldRemoveInboxTag,
			shouldCreateAction: false,
			actionSkill: 'plan',
		});
	}
}

async function applyIterationMutation(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		actionId: Id<'actions'>;
		result: z.infer<typeof actionResultSchema> | undefined;
	},
) {
	//
	const mutation = iterationMutationFromResult(args.result);
	if (!mutation) return undefined;

	const action = await ctx.db.get(args.actionId);
	if (!action || action.owner !== args.owner || action.skillKey !== 'iterate') throw NotFound();

	const file = await ensureFileOwner(ctx, {
		fileId: action.file,
		owner: args.owner,
	});

	if (mutation.body !== undefined) {
		const current = await renderCurrentContent(ctx, { file });
		const body = sanitizeInternalIdLeaks({
			text: mutation.body,
			allowedInternalIdText: current,
		});
		if (body.trim() && current !== body) {
			await writeFileContent(ctx, {
				fileId: action.file,
				owner: args.owner,
				author: args.actionId,
				content: body,
				shouldCreateAction: false,
			});
		}
	}

	if (mutation.tags.length > 0) {
		await setFileTags(ctx, {
			owner: args.owner,
			file: action.file,
			author: args.actionId,
			tags: mutation.tags,
			shouldCreateAction: false,
			actionSkill: 'iterate',
		});
	}
}

function planMutationFromResult(result: z.infer<typeof actionResultSchema> | undefined) {
	//
	const parsed = planMutationSchema.safeParse(result?.metadata?.['planMutation']);
	return parsed.success ? parsed.data : undefined;
}

function iterationMutationFromResult(result: z.infer<typeof actionResultSchema> | undefined) {
	//
	const parsed = iterationMutationSchema.safeParse(result?.metadata?.['iterationMutation']);
	return parsed.success ? parsed.data : undefined;
}

function sanitizeInternalIdLeaks(args: { text: string; allowedInternalIdText: string }) {
	//
	const blockedIds = internalIdsIn(args.text).filter((id) => !args.allowedInternalIdText.includes(id));
	if (blockedIds.length === 0) return args.text;

	const blocked = new Set(blockedIds);
	const lines = args.text.split('\n').filter((line) => {
		for (const id of blocked) {
			if (line.includes(id)) return false;
		}

		return true;
	});

	return lines.join('\n').trim();
}

function internalIdsIn(text: string) {
	//
	return Array.from(new Set(text.match(/\b[a-z][a-z0-9]{24,}\b/g) ?? []));
}

export const _recordSandboxOutputs = internalMutation({
	args: {
		owner: zid('users'),
		actionId: zid('actions'),
		outputs: z.array(recordedSandboxOutputSchema),
	},
	handler: async (ctx, { owner, actionId, outputs }) => {
		//
		const action = await ctx.db.get(actionId);
		if (!action || action.owner !== owner) throw NotFound();

		const files = [];

		for (const output of outputs) {
			const name = await uniqueOutputName(ctx, {
				owner,
				parent: action.file,
				path: output.path,
			});
			const file = await createFile(ctx, {
				owner,
				parent: action.file,
				name,
				author: actionId,
				content: 'content' in output ? output.content : undefined,
				tags: [
					{ key: 'kind', value: 'artifact' },
					{ key: 'source', value: 'sandbox' },
				],
				shouldAddInboxTag: false,
				shouldCreateAction: false,
			});
			if ('pointer' in output) {
				await ctx.db.patch(file, {
					currentContent: output.pointer,
					updatedAt: Date.now(),
				});
			}

			files.push(
				actionResultFileSchema.parse({
					file,
					path: output.path,
					size: output.size,
					contentType: output.contentType,
				}),
			);
		}

		return {
			files,
		};
	},
});

async function uniqueOutputName(
	ctx: Parameters<typeof findChildByName>[0],
	args: {
		owner: Parameters<typeof findChildByName>[1]['owner'];
		parent: Parameters<typeof findChildByName>[1]['parent'];
		path: string;
	},
) {
	//
	const name = outputName(args.path);
	let candidate = name;
	let suffix = 2;

	while (
		await findChildByName(ctx, {
			owner: args.owner,
			parent: args.parent,
			name: candidate,
		})
	) {
		candidate = withNumericSuffix(name, suffix);
		suffix += 1;
	}

	return candidate;
}

function outputName(path: string) {
	//
	const parts = path.split('/');

	for (let index = parts.length - 1; index >= 0; index -= 1) {
		const part = parts[index];
		if (part) return part;
	}

	return 'output.txt';
}

function withNumericSuffix(name: string, suffix: number) {
	//
	const dot = name.lastIndexOf('.');
	if (dot <= 0) return `${name}-${suffix}`;

	return `${name.slice(0, dot)}-${suffix}${name.slice(dot)}`;
}

async function applySettledResultState(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		actionId: Id<'actions'>;
		result: z.infer<typeof actionResultSchema> | undefined;
	},
) {
	//
	if (args.result?.metadata?.['kind'] !== 'seek') return;
	if (args.result.metadata['seekState'] !== 'done') return;

	const action = await ctx.db.get(args.actionId);
	if (!action || action.owner !== args.owner) throw NotFound();

	await setFileTags(ctx, {
		owner: args.owner,
		file: action.file,
		author: args.actionId,
		tags: [{ key: 'status', value: 'done' }],
		shouldCreateAction: false,
		actionSkill: 'iterate',
	});
}

function shouldReleaseAvailableBudgetOnSettle(result: z.infer<typeof actionResultSchema> | undefined) {
	//
	return result?.metadata?.['kind'] === 'seek' && result.metadata['seekState'] === 'done';
}
