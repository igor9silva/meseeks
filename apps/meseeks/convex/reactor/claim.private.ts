import { z } from 'zod/v3';
import type { Doc, Id } from 'convex/_generated/dataModel';
import type { MutationCtx } from 'convex/_generated/server';
import { internal } from 'convex/_generated/api';
import { preparationActionDetailSchema } from 'schemas/actionDetailSchema';
import { intelligenceKeys } from 'schemas/intelligenceSchema';
import {
	configuredSkillKindSchema,
	decisionConfigSchema,
	executeConfigSchema,
	httpConfigSchema,
} from 'schemas/skillSchema';
import { claimedSkillSchema, type ClaimedSkill } from 'schemas/reactorSchema';
import { isError, NOT_FOUND_ERROR } from 'lib/errors';
import { stringToZod } from 'lib/zodToString';
import { recordActionDetail, recordActionPreparation } from '../action/details.private';
import { prepareCompile } from '../compile.private';
import { commitUploadInputSchema, prepareCommitUpload } from '../instincts/commitUpload.private';
import { executeInputSchema } from '../instincts/execute.private';
import { prepareExecute } from '../execute.private';
import { findInstinct } from '../instincts/index.private';
import { prepareUpload, prepareUploadInputSchema } from '../instincts/prepareUpload.private';
import { thinkInputSchema } from '../instincts/think.private';
import { prepareWrite, writeInputSchema } from '../instincts/write.private';
import { prepareMagicRock } from '../magicRock.private';
import { prepareRequest, requestPreparationSchema } from '../request.private';
import { ensureInstinctSkillRows, findSkillSafe } from '../skills.private';

type PreparedClaim =
	| {
			kind: 'claimable';
			input: Record<string, unknown>;
			preparation: z.infer<typeof preparationActionDetailSchema>;
			skill: ClaimedSkill;
	  }
	| {
			kind: 'unclaimable';
			reason: string;
	  };

export async function claimNextAction(ctx: MutationCtx, { owner, root }: { owner: Id<'users'>; root: Id<'files'> }) {
	//
	const actions = await ctx.db
		.query('actions')
		.withIndex('by_root_status', (q) =>
			q
				.eq('root', root) //
				.eq('status', 'enqueued'),
		)
		.order('asc')
		.collect();
	for (const action of actions) {
		if (action.owner !== owner) continue;
		if (action.claimedAt) continue;

		const prepared = await prepareClaim(ctx, {
			owner,
			action,
		});
		if (prepared.kind === 'unclaimable') {
			await skipUnclaimableAction(ctx, {
				action,
				reason: prepared.reason,
			});
			continue;
		}

		await recordActionPreparation(ctx, { detail: prepared.preparation });

		const scheduledFunctionId = await ctx.scheduler.runAfter(0, internal.reactor._perform, {
			action: action._id,
		});
		const claimedAt = Date.now();

		await ctx.db.patch(action._id, {
			claimedAt,
			scheduledFunctionId,
		});

		return action._id;
	}

	return undefined;
}

export async function resolveCallableSkill(
	ctx: MutationCtx,
	{ owner, root, key }: { owner: Id<'users'>; root: Id<'files'>; key: string },
): Promise<ClaimedSkill> {
	//
	await ensureInstinctSkillRows(ctx, {});

	const skill = await findSkillSafe(ctx, { owner, root, key });
	if (!skill) throw new Error(`Unknown skill: ${key}`);

	return claimedSkillSchema.parse({
		source: skill.source,
		key: skill.key,
		kind: skill.kind,
		config: skill.config ?? {},
		inputSchema: skill.inputSchema,
		outputSchema: skill.outputSchema,
	});
}

export function validateSkillInput(skill: ClaimedSkill, input: Record<string, unknown>): Record<string, unknown> {
	//
	if (skill.source !== 'instinct') return z.record(z.unknown()).parse(stringToZod(skill.inputSchema).parse(input));

	const instinct = findInstinct(skill.key);
	if (!instinct) throw new Error(`Unknown instinct: ${skill.key}`);
	return z.record(z.unknown()).parse(instinct.inputSchema.parse(input));
}

export function findActionIntelligence(
	input: Record<string, unknown>,
	intelligence?: z.infer<typeof intelligenceKeys>,
) {
	//
	if (intelligence) return intelligence;
	if (typeof input.intelligence !== 'string') return undefined;

	const parsed = intelligenceKeys.safeParse(input.intelligence);
	if (!parsed.success) return undefined;

	return parsed.data;
}

async function prepareClaim(
	ctx: MutationCtx,
	{ owner, action }: { owner: Id<'users'>; action: Doc<'actions'> },
): Promise<PreparedClaim> {
	//
	try {
		const skill = await findClaimableSkill(ctx, {
			owner,
			root: action.root,
			key: action.skill,
		});
		if (!skill) {
			return {
				kind: 'unclaimable',
				reason: `Unknown skill: ${action.skill}`,
			};
		}

		const input = validateSkillInput(skill, action.input);
		const preparation = await prepareAction(ctx, {
			action,
			input,
			skill,
		});

		return {
			kind: 'claimable',
			input,
			preparation,
			skill,
		};
	} catch (error) {
		const reason = claimabilityFailureReason(error);
		if (!reason) throw error;

		return {
			kind: 'unclaimable',
			reason,
		};
	}
}

async function findClaimableSkill(
	ctx: MutationCtx,
	{ owner, root, key }: { owner: Id<'users'>; root: Id<'files'>; key: string },
) {
	//
	await ensureInstinctSkillRows(ctx, {});

	const skill = await findSkillSafe(ctx, { owner, root, key });
	if (!skill) return undefined;

	return claimedSkillSchema.parse({
		source: skill.source,
		key: skill.key,
		kind: skill.kind,
		config: skill.config ?? {},
		inputSchema: skill.inputSchema,
		outputSchema: skill.outputSchema,
	});
}

async function skipUnclaimableAction(ctx: MutationCtx, { action, reason }: { action: Doc<'actions'>; reason: string }) {
	//
	const now = Date.now();
	await recordActionDetail(ctx, {
		detail: {
			owner: action.owner,
			action: action._id,
			createdAt: now,
			kind: 'error',
			code: 'unclaimable',
			message: reason,
		},
	});

	await ctx.db.patch(action._id, {
		status: 'skipped',
		finishedAt: now,
		warnings: (action.warnings ?? []).concat(reason),
	});
}

function claimabilityFailureReason(error: unknown) {
	//
	if (error instanceof z.ZodError) return `Invalid claim preparation: ${error.message}`;
	if (isError(NOT_FOUND_ERROR, error)) return 'Claim preparation referenced a missing resource.';
	if (error instanceof Error && error.message === 'File changed before write.') return error.message;

	return undefined;
}

async function prepareAction(
	ctx: MutationCtx,
	args: {
		action: Doc<'actions'>;
		input: Record<string, unknown>;
		skill: ClaimedSkill;
	},
) {
	//
	if (args.skill.source !== 'instinct') {
		return prepareStoredSkill({
			action: args.action,
			input: args.input,
			skill: args.skill,
		});
	}

	if (args.skill.key === 'think') {
		const input = thinkInputSchema.parse(args.input);
		const preparation = prepareMagicRock({
			intelligence: input.intelligence ?? args.action.intelligence,
			prompt: input.prompt,
		});

		return preparationActionDetailSchema.parse({
			...basePreparation(args.action),
			skillKind: 'think',
			...preparation,
		});
	}

	if (args.skill.key === 'request') {
		const preparation = prepareRequest(requestPreparationSchema.parse(args.input));

		return preparationActionDetailSchema.parse({
			...basePreparation(args.action),
			skillKind: 'request',
			...preparation,
		});
	}

	if (args.skill.key === 'execute') {
		const input = executeInputSchema.parse(args.input);
		const preparation = prepareExecute({
			root: args.action.root,
			...input,
		});

		return preparationActionDetailSchema.parse({
			...basePreparation(args.action),
			skillKind: 'execute',
			...preparation,
		});
	}

	if (args.skill.key === 'write') {
		return preparationActionDetailSchema.parse(
			await prepareWrite(ctx, {
				action: args.action,
				input: writeInputSchema.parse(args.input),
			}),
		);
	}

	if (args.skill.key === 'prepareUpload') {
		return preparationActionDetailSchema.parse(
			await prepareUpload(ctx, {
				action: args.action,
				input: prepareUploadInputSchema.parse(args.input),
			}),
		);
	}

	if (args.skill.key === 'commitUpload') {
		return preparationActionDetailSchema.parse(
			await prepareCommitUpload(ctx, {
				action: args.action,
				input: commitUploadInputSchema.parse(args.input),
			}),
		);
	}

	if (args.skill.key === 'compile') {
		return await prepareCompile(ctx, { action: args.action });
	}

	return preparationActionDetailSchema.parse({
		...basePreparation(args.action),
		skillKind: 'instinct',
	});
}

function prepareStoredSkill(args: { action: Doc<'actions'>; input: Record<string, unknown>; skill: ClaimedSkill }) {
	//
	const kind = configuredSkillKindSchema.parse(args.skill.kind);
	const config = args.skill.config ?? {};

	if (kind === 'think') {
		const parsedConfig = decisionConfigSchema.parse(config);
		const prompt = textFromInput(args.input, 'prompt') ?? parsedConfig.instructions;
		const intelligence = parsedConfig.model === 'auto' ? args.action.intelligence : parsedConfig.model;
		const preparation = prepareMagicRock({
			intelligence,
			prompt,
		});

		return preparationActionDetailSchema.parse({
			...basePreparation(args.action),
			skillKind: 'think',
			...preparation,
		});
	}

	if (kind === 'request') {
		const parsedConfig = httpConfigSchema.parse(config);
		const preparation = prepareRequest({
			url: parsedConfig.url,
			method: parsedConfig.method,
			headers: parsedConfig.headers,
			body: args.input.body,
		});

		return preparationActionDetailSchema.parse({
			...basePreparation(args.action),
			skillKind: 'request',
			...preparation,
		});
	}

	const parsedConfig = executeConfigSchema.parse(config);
	const inputLanguage = textFromInput(args.input, 'language');
	const language = parsedConfig.language ?? 'javascript';
	const requestedLanguage = inputLanguage === 'javascript' || inputLanguage === 'python' ? inputLanguage : language;
	const preparation = prepareExecute({
		root: args.action.root,
		code: String(args.input.code ?? ''),
		language: requestedLanguage,
		timeoutSeconds: parsedConfig.timeoutSeconds,
	});

	return preparationActionDetailSchema.parse({
		...basePreparation(args.action),
		skillKind: 'execute',
		...preparation,
	});
}

function basePreparation(action: Doc<'actions'>) {
	//
	const now = Date.now();

	return {
		owner: action.owner,
		action: action._id,
		createdAt: now,
		kind: 'preparation' as const,
		skill: action.skill,
		preparedAt: now,
	};
}

function textFromInput(input: Record<string, unknown>, key: string) {
	//
	const value = input[key];
	if (typeof value !== 'string') return undefined;

	return value;
}
