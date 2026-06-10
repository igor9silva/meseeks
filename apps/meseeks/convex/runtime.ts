'use node';

import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { action, internalAction } from 'lib/convex';
import {
	createDaytonaReactorSandbox,
	daytonaOutputSchema,
	daytonaSettingsSchema,
	materializeDaytonaWorkspaceText,
} from 'lib/daytonaSandbox';
import { Unauthorized } from 'lib/errors';
import { estimateIntelligenceCost, referenceIntelligenceSelection } from 'lib/proDefinitions';
import type { IntelligenceRunInput } from 'lib/reactor/adapters';
import { createStatelessIntelligenceAdapter } from 'lib/reactor/runtimeAdapters';
import { actionResultFileSchema, actionResultSchema, actionWarningSchema, costSchema } from 'schemas/actionSchema';
import { env } from 'schemas/envSchema';
import { fileBudgetSchema, objectContentPointerSchema } from 'schemas/fileSchema';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import type { ActionCtx } from './_generated/server';
import { createConfiguredObjectStorageAdapter } from './objectStorage.private';

const settledActionStatusSchema = z.enum(['succeeded', 'failed', 'skipped']);
const settledPatchSchema = z
	.object({
		patch: z.string().optional(),
	})
	.passthrough();
const claimResultSchema = z.union([
	z.object({ status: z.literal('running') }),
	z.object({ status: z.literal('settled') }),
	z.object({ status: z.literal('already-running'), reservedBudget: z.bigint() }),
	z.object({ status: z.literal('pending-authorization') }),
	z.object({ status: z.literal('not-claimable'), actionStatus: z.string() }),
	z.object({ status: z.literal('waiting-for-cause') }),
	z.object({ status: z.literal('budget-failed') }),
]);
const managedSoftSkillNames = ['think', 'plan', 'iterate'];
const trustedInstinctSkillNames: string[] = [];

const openAiResponseSchema = z.object({
	output_text: z.string().optional(),
	output: z.array(z.record(z.unknown())).default([]),
	status: z.string().optional(),
	incomplete_details: z.record(z.unknown()).nullable().optional(),
	usage: z.record(z.unknown()).optional(),
});

const openAiUsageSchema = z
	.object({
		input_tokens: z.number().int().nonnegative().default(0),
		output_tokens: z.number().int().nonnegative().default(0),
	})
	.passthrough();

const openAiMessageSchema = z
	.object({
		type: z.literal('message'),
		content: z
			.array(
				z
					.object({
						type: z.literal('output_text'),
						text: z.string(),
					})
					.passthrough(),
			)
			.default([]),
	})
	.passthrough();

const openAiReasoningSchema = z
	.object({
		type: z.literal('reasoning'),
		summary: z
			.array(
				z
					.object({
						text: z.string(),
					})
					.passthrough(),
			)
			.default([]),
	})
	.passthrough();

const intelligenceProviderSchema = z.object({
	provider: z.enum(['deepseek', 'moonshot', 'openai']),
	intelligence: z.string().min(1),
});
const runtimeIntelligenceSelectionSchema = z
	.object({
		intelligence: z.string().min(1),
		provider: intelligenceProviderSchema,
		deprecatedAt: z.number().optional(),
		deactivatedAt: z.number().optional(),
	})
	.passthrough();

const chatCompletionUsageSchema = z
	.object({
		prompt_tokens: z.number().int().nonnegative().default(0),
		completion_tokens: z.number().int().nonnegative().default(0),
	})
	.passthrough();

const chatCompletionChoiceSchema = z
	.object({
		index: z.number().int().nonnegative(),
		finish_reason: z.string().nullable().optional(),
		message: z
			.object({
				content: z.string().nullable().optional(),
			})
			.passthrough(),
	})
	.passthrough();

const chatCompletionResponseSchema = z
	.object({
		id: z.string().optional(),
		created: z.number().optional(),
		model: z.string().optional(),
		object: z.string().optional(),
		choices: z.array(chatCompletionChoiceSchema).default([]),
		usage: z.record(z.unknown()).optional(),
	})
	.passthrough();

const inputTextContentSchema = z
	.object({
		type: z.literal('input_text'),
		text: z.string(),
	})
	.passthrough();

const sandboxPathSchema = z
	.string()
	.min(1)
	.transform((path, ctx) => {
		const normalized = normalizeSandboxPath(path);
		if (!normalized) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Sandbox paths must stay under /workspace and avoid parent traversal.',
			});
			return z.NEVER;
		}

		return normalized;
	});

const sandboxInlineFileSchema = z.object({
	path: sandboxPathSchema,
	content: z.string(),
});

const sandboxOptionsSchema = z
	.object({
		command: z.string().min(1).optional(),
		env: z.record(z.string()).default({}),
		timeoutMs: z.number().int().min(1_000).max(540_000).optional(),
		files: z.array(sandboxInlineFileSchema).default([]),
		outputs: z.array(daytonaOutputSchema.extend({ path: sandboxPathSchema })).default([]),
	})
	.passthrough();
const executeLanguageSchema = z.enum(['javascript', 'python']);
const executeCodeSchema = z.object({
	code: z.string().min(1),
	language: executeLanguageSchema.default('javascript'),
});

const recordedSandboxOutputsSchema = z.object({
	files: z.array(actionResultFileSchema),
	patch: z.string(),
});

const seekStateSchema = z.enum(['continue', 'done', 'blocked']);
const planTagSchema = z.object({
	key: z.string().min(1),
	value: z.string(),
});
const planMutationSchema = z.object({
	title: z.string().min(1).max(60).optional(),
	body: z.string().min(1).optional(),
	tags: z.array(planTagSchema).default([]),
	shouldRemoveInboxTag: z.boolean().default(true),
	note: z.string().min(1).optional(),
});
const planOutputSchema = z.object({
	title: z.string().min(1).max(80).optional(),
	body: z.string().min(1),
	tags: z.array(planTagSchema).default([]),
	note: z.string().min(1).optional(),
});
const iterationMutationSchema = z.object({
	body: z.string().min(1).optional(),
	tags: z.array(planTagSchema).default([]),
	state: seekStateSchema,
	note: z.string().min(1).optional(),
});
const iterationOutputSchema = z.object({
	body: z.string().min(1).optional(),
	tags: z.array(planTagSchema).default([]),
	state: seekStateSchema,
	note: z.string().min(1).optional(),
});

type RecordedSandboxOutput =
	| {
			path: string;
			content: string;
			size: number;
			contentType?: string;
	  }
	| {
			path: string;
			pointer: z.infer<typeof objectContentPointerSchema>;
			size: number;
			contentType?: string;
	  };

export const perform = action({
	args: {
		actionId: zid('actions'),
		expectedCost: z.bigint().default(0n),
		maxCost: z.bigint().default(0n),
	},
	handler: async (ctx, { actionId, expectedCost, maxCost }): Promise<unknown> => {
		//
		const currentUser = await currentActionUser(ctx);
		return await performOwnedAction({
			ctx,
			owner: currentUser._id,
			actionId,
			expectedCost,
			maxCost,
		});
	},
});

export const _perform = internalAction({
	args: {
		owner: zid('users'),
		actionId: zid('actions'),
		expectedCost: z.bigint().default(0n),
		maxCost: z.bigint().default(0n),
	},
	handler: async (ctx, args): Promise<unknown> => await performOwnedAction({ ctx, ...args }),
});

async function performOwnedAction(args: {
	ctx: ActionCtx;
	owner: Doc<'users'>['_id'];
	actionId: Doc<'actions'>['_id'];
	expectedCost: bigint;
	maxCost: bigint;
}) {
	//
	const context = await args.ctx.runQuery(internal.runtimeState._context, {
		owner: args.owner,
		actionId: args.actionId,
	});
	const parsedContext = runtimeContextSchema.parse(context);
	await args.ctx.runMutation(internal.runtimeState._upsertDetails, {
		owner: args.owner,
		actionId: args.actionId,
		skill: parsedContext.skill?._id,
		skillFile: parsedContext.skill?.file,
		loop: parsedContext.loop?._id,
		instructions: parsedContext.skill?.body,
		input: parsedContext.action.args,
		...initialExecutionDetails(parsedContext),
	});
	const estimatedCost = estimateClaimCost({
		context: parsedContext,
		expectedCost: args.expectedCost,
		maxCost: args.maxCost,
	});
	const claimBlock = preClaimRuntimeBlock({
		context: parsedContext,
	});
	if (claimBlock) {
		await args.ctx.runMutation(internal.runtimeState._settle, {
			owner: args.owner,
			actionId: args.actionId,
			status: settledActionStatusSchema.parse(claimBlock.status),
			result: claimBlock.result,
			costs: claimBlock.costs,
			warnings: claimBlock.warnings,
		});
		await args.ctx.runMutation(internal.runtimeState._upsertDetails, {
			owner: args.owner,
			actionId: args.actionId,
			...detailsForPerformed(claimBlock),
		});
		return claimBlock;
	}
	const claim = claimResultSchema.parse(
		await args.ctx.runMutation(internal.runtimeState._claim, {
			owner: args.owner,
			actionId: args.actionId,
			expectedCost: estimatedCost.expectedCost,
			maxCost: estimatedCost.maxCost,
		}),
	);
	if (claim.status !== 'running') return claim;

	const performed = await performClaimedAction({
		ctx: args.ctx,
		owner: args.owner,
		actionId: args.actionId,
		context: parsedContext,
		maxCost: estimatedCost.maxCost,
	});

	await args.ctx.runMutation(internal.runtimeState._settle, {
		owner: args.owner,
		actionId: args.actionId,
		status: settledActionStatusSchema.parse(performed.status),
		result: performed.result,
		patch: settledPatch(performed),
		costs: performed.costs,
		warnings: detailsForPerformed(performed).warnings,
	});
	const details = detailsForPerformed(performed);
	await args.ctx.runMutation(internal.runtimeState._upsertDetails, {
		owner: args.owner,
		actionId: args.actionId,
		...details,
	});
	if (performed.status === 'succeeded') {
		await args.ctx.runAction(internal.triggerIsolate._evaluate, {
			owner: args.owner,
			actionId: args.actionId,
		});
	}

	return performed;
}

function settledPatch(value: unknown) {
	//
	const parsed = settledPatchSchema.safeParse(value);
	return parsed.success ? parsed.data.patch : undefined;
}

async function currentActionUser(ctx: ActionCtx): Promise<Doc<'users'>> {
	//
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw Unauthorized();

	const parsedAppUserId = zid('users').safeParse(identity.userId);
	return await ctx.runQuery(internal.users._findCurrentByIdentity, {
		authUserId: identity.subject,
		appUserId: parsedAppUserId.success ? parsedAppUserId.data : undefined,
	});
}

async function performClaimedAction(args: {
	ctx: ActionCtx;
	owner: Doc<'users'>['_id'];
	actionId: Doc<'actions'>['_id'];
	context: unknown;
	maxCost: bigint;
}) {
	//
	const parsedContext = runtimeContextSchema.parse(args.context);
	const skillKind = parsedContext.skill?.kind;
	const skillName = parsedContext.action.skillKey;

	if (skillKind === 'soft' || isManagedSoftSkill(skillName)) {
		return await performSoftSkill({
			context: parsedContext,
			maxCost: args.maxCost,
		});
	}

	if (skillKind === 'code' || skillName === 'execute') {
		return await performSandboxSkill({
			ctx: args.ctx,
			owner: args.owner,
			actionId: args.actionId,
			context: parsedContext,
		});
	}

	if (!isTrustedInstinct(skillName)) {
		return {
			status: settledActionStatusSchema.parse('failed'),
			result: {
				text: `Unknown skill: ${skillName}`,
				files: [],
			},
			costs: [],
			details: {
				kind: 'unknown-skill',
			},
		};
	}

	return {
		status: settledActionStatusSchema.parse('succeeded'),
		result: {
			text: `${skillName} completed.`,
			files: [],
		},
		costs: [],
		details: {
			kind: 'instinct',
		},
	};
}

function preClaimRuntimeBlock(args: { context: z.infer<typeof runtimeContextSchema> }) {
	//
	if (!usesRuntimeIntelligence(args.context)) return undefined;

	const resolvedIntelligence = resolveRuntimeIntelligence({
		context: args.context,
	});
	if (!resolvedIntelligence.value?.deactivatedAt) return undefined;

	const provider = resolvedIntelligence.value.provider;
	const warning = runtimeWarning({
		key: 'intelligence-deactivated',
		severity: 'error',
		source: 'claim',
		message: `${resolvedIntelligence.selection} is deactivated and cannot run.`,
	});

	return {
		status: settledActionStatusSchema.parse('failed'),
		result: {
			text: warning.message,
			files: [],
			metadata: {
				kind: 'intelligence',
				reason: 'deactivated',
				selection: resolvedIntelligence.selection,
			},
		},
		costs: [],
		warnings: [warning],
		details: {
			provider: provider.provider,
			model: provider.intelligence,
			deactivatedAt: resolvedIntelligence.value.deactivatedAt,
		},
	};
}

function initialExecutionDetails(context: z.infer<typeof runtimeContextSchema>) {
	//
	if (!usesRuntimeIntelligence(context)) return {};

	const resolvedIntelligence = resolveRuntimeIntelligence({ context });
	if (!resolvedIntelligence.value) return {};

	const provider = resolvedIntelligence.value.provider;
	return {
		provider: provider.provider,
		model: provider.intelligence,
	};
}

const runtimeContextSchema = z.object({
	action: z
		.object({
			skillKey: z.string(),
			intelligenceKey: z.string().optional(),
			args: z.record(z.unknown()),
		})
		.passthrough(),
	skill: z
		.object({
			_id: zid('skills').optional(),
			file: zid('files').optional(),
			kind: z.enum(['instinct', 'soft', 'code']),
			fileName: z.string().optional(),
			body: z.string().default(''),
		})
		.passthrough()
		.optional(),
	loop: z
		.object({
			_id: zid('loops'),
			defaultIntelligenceKey: z.string().min(1).optional(),
		})
		.passthrough()
		.optional(),
	file: z
		.object({
			name: z.string(),
			budget: fileBudgetSchema.optional(),
		})
		.passthrough(),
	tags: z.array(
		z
			.object({
				key: z.string(),
				value: z.string(),
			})
			.passthrough(),
	),
	content: z.string(),
	recentActions: z.array(z.record(z.unknown())),
});

const performedDetailsSchema = z
	.object({
		result: actionResultSchema.optional(),
		costs: z.array(costSchema).default([]),
		warnings: z.array(actionWarningSchema).optional(),
		patch: z.string().optional(),
		details: z.record(z.unknown()).optional(),
	})
	.passthrough();

function detailsForPerformed(value: unknown) {
	//
	const parsed = performedDetailsSchema.safeParse(value);
	if (!parsed.success) {
		return {
			result: undefined,
			costs: [],
			warnings: undefined,
			patch: undefined,
			provider: undefined,
			model: undefined,
			output: undefined,
			usage: undefined,
		};
	}

	const details = executionDetails(parsed.data.details);

	return {
		result: parsed.data.result,
		costs: parsed.data.costs,
		warnings: parsed.data.warnings,
		patch: parsed.data.patch,
		...details,
	};
}

function executionDetails(details: Record<string, unknown> | undefined) {
	//
	if (!details) return {};

	const receipt: {
		provider?: string;
		model?: string;
		output?: unknown;
		usage?: unknown;
	} = {};
	const provider = stringMetadata(details, 'provider');
	const model = stringMetadata(details, 'model');
	const output = details['output'];
	const usage = details['usage'];

	if (provider) receipt.provider = provider;
	if (model) receipt.model = model;
	if (output !== undefined) receipt.output = output;
	if (usage !== undefined) receipt.usage = usage;

	return receipt;
}

function isManagedSoftSkill(skill: string) {
	//
	return managedSoftSkillNames.includes(skill);
}

function usesRuntimeIntelligence(context: z.infer<typeof runtimeContextSchema>) {
	//
	return context.skill?.kind === 'soft' || isManagedSoftSkill(context.action.skillKey);
}

function isTrustedInstinct(skill: string) {
	//
	return trustedInstinctSkillNames.includes(skill);
}

function runtimeIntelligenceWarnings(args: {
	selection: string;
	value: z.infer<typeof runtimeIntelligenceSelectionSchema>;
	source: 'claim' | 'perform' | 'settle';
}) {
	//
	const warnings = [];
	if (args.value.deprecatedAt) {
		warnings.push(
			runtimeWarning({
				key: 'intelligence-deprecated',
				severity: 'warning',
				source: args.source,
				message: `${args.selection} is deprecated and may be replaced soon.`,
			}),
		);
	}

	return warnings;
}

function runtimeWarning(args: {
	key: string;
	severity: 'info' | 'warning' | 'error';
	source: 'claim' | 'perform' | 'settle';
	message: string;
}) {
	//
	return actionWarningSchema.parse({
		...args,
		createdAt: Date.now(),
	});
}

const recentActionContextSchema = z
	.object({
		index: z.number(),
		skillKey: z.string(),
		status: z.string(),
		depth: z.number(),
		args: z.record(z.unknown()).optional(),
		result: z
			.object({
				text: z.string().optional(),
				metadata: z.record(z.unknown()).optional(),
			})
			.optional(),
		costs: z
			.array(
				z.object({
					amount: z.bigint(),
					description: z.string().optional(),
					symbol: z.string().optional(),
				}),
			)
			.default([]),
		settledAt: z.number().optional(),
	})
	.passthrough();

async function performSoftSkill(args: { context: z.infer<typeof runtimeContextSchema>; maxCost: bigint }) {
	//
	const resolvedIntelligence = resolveRuntimeIntelligence({
		context: args.context,
	});
	if (!resolvedIntelligence.value) {
		return {
			status: settledActionStatusSchema.parse('failed'),
			result: {
				text: resolvedIntelligence.error,
				files: [],
				metadata: {
					kind: 'intelligence',
					reason: 'unknown-intelligence',
					selection: resolvedIntelligence.selection,
				},
			},
			costs: [],
			details: {
				kind: 'unknown-intelligence',
				selection: resolvedIntelligence.selection,
			},
		};
	}

	const warnings = runtimeIntelligenceWarnings({
		selection: resolvedIntelligence.selection,
		value: resolvedIntelligence.value,
		source: 'perform',
	});
	const provider = resolvedIntelligence.value.provider;
	const apiKey = providerApiKey(provider.provider);
	if (!apiKey) {
		return {
			status: settledActionStatusSchema.parse('failed'),
			result: {
				text: `${providerLabel(provider.provider)} provider is not configured.`,
				files: [],
				metadata: {
					kind: 'intelligence',
					provider: provider.provider,
				},
			},
			costs: [],
			warnings,
			details: {
				provider: provider.provider,
				model: provider.intelligence,
				configured: false,
			},
		};
	}

	const instructions = softSkillInstructions(args.context);
	if (!instructions) {
		return {
			status: settledActionStatusSchema.parse('failed'),
			result: {
				text: `Skill ${args.context.action.skillKey} is missing instructions.`,
				files: [],
				metadata: {
					kind: 'intelligence',
					provider: provider.provider,
					reason: 'missing-instructions',
				},
			},
			costs: [],
			warnings,
			details: {
				provider: provider.provider,
				model: provider.intelligence,
				configured: false,
				reason: 'missing-instructions',
			},
		};
	}

	const adapter = createStatelessIntelligenceAdapter({
		run: async (input) =>
			await runProviderIntelligence({
				apiKey,
				provider,
				input,
			}),
	});
	const intelligenceResult = await adapter
		.run({
			intelligence: provider.intelligence,
			instructions,
			input: [
				{
					role: 'user',
					content: [
						{
							type: 'input_text',
							text: buildIntelligenceContext(args.context),
						},
					],
				},
			],
			settings: {
				...structuredOutputSettings({
					provider: provider.provider,
					skill: args.context.action.skillKey,
				}),
				include: provider.provider === 'openai' ? ['reasoning.encrypted_content'] : [],
				billingIntelligence: resolvedIntelligence.value.intelligence,
				provider: provider.provider,
			},
			maxOutputTokens: maxOutputTokensForSkill(args.context.action.skillKey),
		})
		.catch((error: unknown) => ({
			text: error instanceof Error ? error.message : 'Intelligence provider failed.',
			costs: [],
			providerItems: [],
			reasoningSummaries: [],
			metadata: {
				failed: true,
			},
		}));
	if (hasProviderFailure(intelligenceResult.metadata)) {
		return {
			status: settledActionStatusSchema.parse('failed'),
			result: {
				text: intelligenceResult.text,
				files: [],
				metadata: {
					kind: 'intelligence',
					provider: provider.provider,
				},
			},
			costs: intelligenceResult.costs,
			warnings,
			details: {
				provider: provider.provider,
				model: provider.intelligence,
				store: false,
				usage: usageFromProviderResult(intelligenceResult.metadata),
			},
		};
	}

	const allowedInternalIdText = allowedInternalIdsText(args.context);
	const planMutation =
		args.context.action.skillKey === 'plan'
			? parsePlanMutation({
					text: intelligenceResult.text,
					allowedInternalIdText,
				})
			: undefined;
	const iterationMutation =
		args.context.action.skillKey === 'iterate'
			? parseIterationMutation({
					text: intelligenceResult.text,
					content: args.context.content,
					allowedInternalIdText,
				})
			: undefined;
	const seekState = iterationMutation
		? iterationMutation.state
		: seekStateFor({
				skill: args.context.action.skillKey,
				text: intelligenceResult.text,
				content: args.context.content,
			});
	if (planMutation?.status === 'failed') {
		return {
			status: settledActionStatusSchema.parse('failed'),
			result: {
				text: planMutation.error,
				files: [],
				metadata: {
					kind: 'seek',
					step: 'plan',
				},
			},
			costs: intelligenceResult.costs,
			warnings,
			details: {
				provider: provider.provider,
				model: provider.intelligence,
				store: false,
				include: includeSetting({
					provider: provider.provider,
				}),
				output: intelligenceResult.providerItems,
				usage: usageFromProviderResult(intelligenceResult.metadata),
			},
		};
	}
	const succeededPlan = planMutation?.status === 'succeeded' ? planMutation.plan : undefined;
	const seekMetadata = seekState
		? {
				kind: 'seek',
				seekState,
			}
		: {};
	const resultText = sanitizeInternalIdLeaks({
		text: visibleSoftSkillText({
			skill: args.context.action.skillKey,
			text: succeededPlan?.note ?? iterationMutation?.note ?? stripSeekStateMarker(intelligenceResult.text),
			seekState,
		}),
		allowedInternalIdText,
	});
	const metadata: Record<string, unknown> = {
		...seekMetadata,
		step: args.context.action.skillKey,
		reasoningSummaries: intelligenceResult.reasoningSummaries,
	};
	if (succeededPlan) metadata['planMutation'] = succeededPlan;
	if (iterationMutation) metadata['iterationMutation'] = iterationMutation;

	return {
		status: settledActionStatusSchema.parse('succeeded'),
		result: {
			text: resultText,
			files: [],
			metadata,
		},
		patch: undefined,
		costs: intelligenceResult.costs,
		warnings,
		details: {
			provider: provider.provider,
			model: provider.intelligence,
			store: false,
			include: includeSetting({
				provider: provider.provider,
			}),
			output: intelligenceResult.providerItems,
			usage: usageFromProviderResult(intelligenceResult.metadata),
		},
	};
}

function providerApiKey(provider: z.infer<typeof intelligenceProviderSchema>['provider']) {
	//
	if (provider === 'deepseek') return env.DEEPSEEK_API_KEY;
	if (provider === 'moonshot') return env.MOONSHOT_API_KEY;

	return env.OPENAI_API_KEY;
}

function providerLabel(provider: z.infer<typeof intelligenceProviderSchema>['provider']) {
	//
	if (provider === 'deepseek') return 'DeepSeek';
	if (provider === 'moonshot') return 'Kimi';

	return 'OpenAI';
}

function includeSetting(args: { provider: z.infer<typeof intelligenceProviderSchema>['provider'] }) {
	//
	if (args.provider === 'openai') return ['reasoning.encrypted_content'];

	return [];
}

function structuredOutputSettings(args: {
	provider: z.infer<typeof intelligenceProviderSchema>['provider'];
	skill: string;
}) {
	//
	if (!isStructuredSoftSkill(args.skill)) return {};

	const settings: Record<string, unknown> = {
		responseFormat: 'json_object',
	};

	// Kimi thinking intelligences can spend the entire output budget on reasoning and
	// return empty content. Structured mutation steps need compact JSON instead.
	if (args.provider === 'moonshot') settings['thinking'] = { type: 'disabled' };

	return settings;
}

function isStructuredSoftSkill(skill: string) {
	//
	return skill === 'plan' || skill === 'iterate';
}

function maxOutputTokensForSkill(skill: string) {
	//
	if (isStructuredSoftSkill(skill)) return 4096;

	return 2048;
}

function hasProviderFailure(metadata: Record<string, unknown>) {
	//
	return metadata['failed'] === true;
}

function usageFromProviderResult(metadata: Record<string, unknown>) {
	//
	const usage = metadata['usage'];
	return usage === undefined ? undefined : usage;
}

function softSkillInstructions(context: z.infer<typeof runtimeContextSchema>) {
	//
	const parsed = z.string().min(1).safeParse(context.skill?.body);
	if (parsed.success) return parsed.data;

	return undefined;
}

function seekStateFor(args: { skill: string; text: string; content: string }) {
	//
	if (args.skill === 'plan') return seekStateSchema.parse('continue');
	if (args.skill !== 'iterate') return undefined;

	if (!args.text.trim()) return seekStateSchema.parse('blocked');

	const match = /REACTOR_STATE:\s*(continue|done|blocked)/i.exec(args.text);
	const parsed = seekStateSchema.safeParse(match?.[1]?.toLowerCase());
	if (parsed.success) {
		return guardedSeekState({
			state: parsed.data,
			body: args.content,
		});
	}

	return seekStateSchema.parse('blocked');
}

function stripSeekStateMarker(text: string) {
	//
	return text.replace(/\n?\s*REACTOR_STATE:\s*(continue|done|blocked)\s*$/i, '').trim();
}

function visibleSoftSkillText(args: {
	skill: string;
	text: string;
	seekState: z.infer<typeof seekStateSchema> | undefined;
}) {
	//
	if (args.text.trim()) return args.text;
	if (args.skill === 'iterate' && args.seekState === 'blocked') {
		return 'The iterate step did not produce visible output before its token limit, so the loop was blocked instead of continuing.';
	}

	return args.text;
}

type PlanMutationResult =
	| {
			status: 'failed';
			error: string;
	  }
	| {
			status: 'succeeded';
			plan: z.infer<typeof planMutationSchema>;
	  };

function parsePlanMutation(args: { text: string; allowedInternalIdText: string }): PlanMutationResult {
	//
	const value = parseJsonObject(args.text);
	const parsed = planOutputSchema.safeParse(value);
	if (!parsed.success) {
		return {
			status: 'failed',
			error: 'Plan output was not valid task-state JSON.',
		};
	}

	return {
		status: 'succeeded',
		plan: planMutationSchema.parse({
			title: parsed.data.title ? parsed.data.title.slice(0, 60).trim() : undefined,
			body: sanitizeInternalIdLeaks({
				text: parsed.data.body,
				allowedInternalIdText: args.allowedInternalIdText,
			}),
			tags: mergePlanTags(parsed.data.tags),
			shouldRemoveInboxTag: true,
			note: sanitizeInternalIdLeaks({
				text: parsed.data.note ?? 'Updated task plan.',
				allowedInternalIdText: args.allowedInternalIdText,
			}),
		}),
	};
}

function parseIterationMutation(args: { text: string; content: string; allowedInternalIdText: string }) {
	//
	const value = parseJsonObject(args.text);
	const parsed = iterationOutputSchema.safeParse(value);
	if (!parsed.success) return undefined;

	const body = parsed.data.body
		? sanitizeInternalIdLeaks({
				text: parsed.data.body,
				allowedInternalIdText: args.allowedInternalIdText,
			})
		: undefined;
	const state = guardedSeekState({
		state: parsed.data.state,
		body: body ?? args.content,
	});

	return iterationMutationSchema.parse({
		body,
		tags: mergeIterationTags({
			tags: parsed.data.tags,
			state,
		}),
		state,
		note: sanitizeInternalIdLeaks({
			text: parsed.data.note ?? visibleIterationNote(state),
			allowedInternalIdText: args.allowedInternalIdText,
		}),
	});
}

function guardedSeekState(args: { state: z.infer<typeof seekStateSchema>; body: string }) {
	//
	if (args.state !== 'done') return args.state;
	if (needsUserDirection(args.body)) return seekStateSchema.parse('blocked');
	if (hasVisibleRemainingWork(args.body)) return seekStateSchema.parse('continue');

	return args.state;
}

function hasVisibleRemainingWork(body: string) {
	//
	return (
		/(^|\n)\s*(?:[-*]|\d+[.)])\s+\[\s\]/.test(body) || /(^|\n)\s*(?:#{1,6}\s*)?next steps?(?:\s|\(|:|$)/i.test(body)
	);
}

function needsUserDirection(body: string) {
	//
	return /\b(?:awaiting|pending)\s+user\s+(?:direction|input|approval)\b/i.test(body);
}

function mergeIterationTags(args: { tags: z.infer<typeof planTagSchema>[]; state: z.infer<typeof seekStateSchema> }) {
	//
	const byKey = new Map<string, z.infer<typeof planTagSchema>>();

	for (const tag of args.tags) {
		if (tag.key === 'status' && tag.value === 'done' && args.state !== 'done') continue;
		byKey.set(tag.key, tag);
	}

	if (args.state === 'done') byKey.set('status', { key: 'status', value: 'done' });

	return Array.from(byKey.values());
}

function visibleIterationNote(state: z.infer<typeof seekStateSchema>) {
	//
	if (state === 'done') return 'Finished iteration.';
	if (state === 'blocked') return 'Blocked iteration.';

	return 'Continued iteration.';
}

function allowedInternalIdsText(context: z.infer<typeof runtimeContextSchema>) {
	//
	return [
		context.file.name,
		context.content,
		stringMetadata(context.action.args, 'message') ?? '',
		stringMetadata(context.action.args, 'text') ?? '',
	].join('\n');
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

function parseJsonObject(text: string) {
	//
	const candidates = [];
	const trimmed = text.trim();
	if (trimmed) candidates.push(trimmed);

	const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
	if (fenced?.[1]) candidates.unshift(fenced[1].trim());

	const firstBrace = text.indexOf('{');
	const lastBrace = text.lastIndexOf('}');
	if (firstBrace >= 0 && lastBrace > firstBrace) {
		candidates.push(text.slice(firstBrace, lastBrace + 1));
	}

	for (const candidate of candidates) {
		try {
			const parsed: unknown = JSON.parse(candidate);
			return parsed;
		} catch {
			continue;
		}
	}

	return undefined;
}

function mergePlanTags(tags: z.infer<typeof planTagSchema>[]) {
	//
	const byKey = new Map<string, z.infer<typeof planTagSchema>>();
	byKey.set('kind', { key: 'kind', value: 'task' });
	byKey.set('status', { key: 'status', value: 'active' });

	for (const tag of tags) {
		byKey.set(tag.key, tag);
	}

	return Array.from(byKey.values());
}

async function runProviderIntelligence(args: {
	apiKey: string;
	provider: z.infer<typeof intelligenceProviderSchema>;
	input: IntelligenceRunInput & { store: false };
}) {
	//
	if (args.provider.provider === 'openai') {
		return await runOpenAiResponses({
			apiKey: args.apiKey,
			input: args.input,
		});
	}

	if (args.provider.provider === 'deepseek') {
		return await runChatCompletions({
			apiKey: args.apiKey,
			endpoint: 'https://api.deepseek.com/chat/completions',
			provider: args.provider.provider,
			input: args.input,
		});
	}

	return await runChatCompletions({
		apiKey: args.apiKey,
		endpoint: 'https://api.moonshot.ai/v1/chat/completions',
		provider: args.provider.provider,
		input: args.input,
	});
}

async function runOpenAiResponses(args: { apiKey: string; input: IntelligenceRunInput & { store: false } }) {
	//
	const body: Record<string, unknown> = {
		model: args.input.intelligence,
		store: false,
		instructions: args.input.instructions,
		input: args.input.input,
		max_output_tokens: args.input.maxOutputTokens,
	};
	const include = responseIncludeSetting(args.input.settings);
	if (include.length > 0) body['include'] = include;

	const response = await fetch('https://api.openai.com/v1/responses', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${args.apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(`Intelligence provider failed with ${response.status}.`);
	}

	const parsed = openAiResponseSchema.parse(await response.json());
	const text = parsed.output_text ?? extractOutputText(parsed.output);
	const reasoningSummaries = extractReasoningSummaries(parsed.output);

	return {
		text,
		costs: intelligenceUsageCosts({
			intelligence: billingIntelligence(args.input.settings) ?? args.input.intelligence,
			usage: parsed.usage,
		}),
		providerItems: parsed.output,
		reasoningSummaries,
		metadata: {
			status: parsed.status,
			incompleteDetails: parsed.incomplete_details,
			usage: parsed.usage,
		},
	};
}

async function runChatCompletions(args: {
	apiKey: string;
	endpoint: string;
	provider: z.infer<typeof intelligenceProviderSchema>['provider'];
	input: IntelligenceRunInput & { store: false };
}) {
	//
	const body: Record<string, unknown> = {
		model: args.input.intelligence,
		messages: chatCompletionMessages(args.input),
		temperature: numberSetting(args.input.settings, 'temperature'),
	};
	if (args.provider === 'moonshot') {
		body['max_completion_tokens'] = args.input.maxOutputTokens;
	} else {
		body['max_tokens'] = args.input.maxOutputTokens;
	}

	if (stringSetting(args.input.settings, 'responseFormat') === 'json_object') {
		body['response_format'] = { type: 'json_object' };
	}

	const thinking = args.input.settings['thinking'];
	if (args.provider === 'moonshot' && isPlainRecord(thinking)) {
		body['thinking'] = thinking;
	}

	const response = await fetch(args.endpoint, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${args.apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(`${providerLabel(args.provider)} provider failed with ${response.status}.`);
	}

	const parsed = chatCompletionResponseSchema.parse(await response.json());
	const text = extractChatCompletionText(parsed.choices);

	return {
		text,
		costs: chatCompletionUsageCosts({
			intelligence: billingIntelligence(args.input.settings) ?? args.input.intelligence,
			usage: parsed.usage,
		}),
		providerItems: chatCompletionProviderItems(parsed.choices),
		reasoningSummaries: [],
		metadata: {
			id: parsed.id,
			object: parsed.object,
			created: parsed.created,
			model: parsed.model,
			usage: parsed.usage,
		},
	};
}

function intelligenceUsageCosts(args: { intelligence: string; usage: Record<string, unknown> | undefined }) {
	//
	const parsed = openAiUsageSchema.safeParse(args.usage ?? {});
	if (!parsed.success) return [];

	const cost = estimateIntelligenceCost({
		intelligence: args.intelligence,
		inputTokens: parsed.data.input_tokens,
		outputTokens: parsed.data.output_tokens,
	});
	if (!cost) return [];

	return [cost];
}

function chatCompletionUsageCosts(args: { intelligence: string; usage: Record<string, unknown> | undefined }) {
	//
	const parsed = chatCompletionUsageSchema.safeParse(args.usage ?? {});
	if (!parsed.success) return [];

	const cost = estimateIntelligenceCost({
		intelligence: args.intelligence,
		inputTokens: parsed.data.prompt_tokens,
		outputTokens: parsed.data.completion_tokens,
	});
	if (!cost) return [];

	return [cost];
}

function responseIncludeSetting(settings: Record<string, unknown>) {
	//
	const parsed = z.array(z.string()).safeParse(settings['include']);
	if (!parsed.success) return [];

	return parsed.data;
}

function numberSetting(settings: Record<string, unknown>, key: string) {
	//
	const value = settings[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringSetting(settings: Record<string, unknown>, key: string) {
	//
	const value = settings[key];
	return typeof value === 'string' ? value : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	//
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function billingIntelligence(settings: Record<string, unknown>) {
	//
	const value = settings['billingIntelligence'];
	return typeof value === 'string' ? value : undefined;
}

function chatCompletionMessages(input: IntelligenceRunInput) {
	//
	const messages = [];
	if (input.instructions.trim()) {
		messages.push({
			role: 'system',
			content: input.instructions,
		});
	}

	const userText = input.input
		.map(inputItemText)
		.filter((text) => Boolean(text.trim()))
		.join('\n\n');
	messages.push({
		role: 'user',
		content: userText || 'Continue.',
	});

	return messages;
}

function inputItemText(item: Record<string, unknown>) {
	//
	const content = item['content'];
	if (Array.isArray(content)) {
		return content
			.map(inputContentText)
			.filter((text) => Boolean(text.trim()))
			.join('\n');
	}

	const text = item['text'];
	if (typeof text === 'string') return text;

	return stringifyForIntelligence(item);
}

function inputContentText(value: unknown) {
	//
	const parsed = inputTextContentSchema.safeParse(value);
	if (parsed.success) return parsed.data.text;

	return '';
}

function extractChatCompletionText(choices: z.infer<typeof chatCompletionChoiceSchema>[]) {
	//
	const parts = [];
	for (const choice of choices) {
		if (choice.message.content) parts.push(choice.message.content);
	}

	return parts.join('\n');
}

function chatCompletionProviderItems(choices: z.infer<typeof chatCompletionChoiceSchema>[]) {
	//
	return choices.map((choice) => ({
		index: choice.index,
		finishReason: choice.finish_reason,
		message: publicChatCompletionMessage(choice.message),
	}));
}

function publicChatCompletionMessage(message: z.infer<typeof chatCompletionChoiceSchema>['message']) {
	//
	const visible: Record<string, unknown> = {};
	const reasoning = providerReasoningSummary(message);

	for (const [key, value] of Object.entries(message)) {
		if (isReasoningField(key)) continue;
		visible[key] = value;
	}

	if (reasoning) visible['reasoning'] = reasoning;

	return visible;
}

function providerReasoningSummary(message: z.infer<typeof chatCompletionChoiceSchema>['message']) {
	//
	const fields = [];
	let characterCount = 0;

	for (const [key, value] of Object.entries(message)) {
		if (!isReasoningField(key) || !hasReasoningValue(value)) continue;
		fields.push(key);
		if (typeof value === 'string') characterCount += value.length;
	}

	if (fields.length === 0) return undefined;

	return {
		kind: 'provider-hidden-reasoning',
		fields,
		characterCount,
	};
}

function isReasoningField(key: string) {
	//
	return key.toLowerCase().includes('reasoning');
}

function hasReasoningValue(value: unknown) {
	//
	if (value === null || value === undefined) return false;
	if (typeof value === 'string') return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === 'object') return Object.keys(value).length > 0;

	return true;
}

async function performSandboxSkill(args: {
	ctx: ActionCtx;
	owner: Doc<'users'>['_id'];
	actionId: Doc<'actions'>['_id'];
	context: z.infer<typeof runtimeContextSchema>;
}) {
	//
	const apiKey = env.DAYTONA_API_KEY;
	if (!apiKey) {
		return {
			status: settledActionStatusSchema.parse('failed'),
			result: {
				text: 'Sandbox provider is not configured.',
				files: [],
				metadata: {
					kind: 'sandbox',
					provider: 'daytona',
					configured: false,
				},
			},
			costs: [],
			details: {
				provider: 'daytona',
				output: {
					configured: false,
				},
				configured: false,
			},
		};
	}

	const actionOptions = sandboxOptionsSchema.safeParse(args.context.action.args);
	if (!actionOptions.success) {
		return failedSandboxResult({
			text: 'Sandbox action arguments are invalid.',
			metadata: {
				issues: actionOptions.error.issues,
			},
		});
	}

	const skillFile = sandboxSkillFile(args.context);
	const executeFile = executeInlineFile(args.context.action);
	const command =
		actionOptions.data.command ??
		executeFile?.command ??
		(skillFile ? sandboxCommandFor(skillFile.path) : undefined);
	if (!command) {
		return failedSandboxResult({
			text: 'Sandbox command is not configured.',
			metadata: {},
		});
	}

	const settingsInput: Record<string, unknown> = { apiKey };
	if (env.DAYTONA_API_URL) settingsInput['apiUrl'] = env.DAYTONA_API_URL;
	if (env.DAYTONA_TARGET) settingsInput['target'] = env.DAYTONA_TARGET;
	if (env.DAYTONA_IMAGE) settingsInput['image'] = env.DAYTONA_IMAGE;
	const settings = daytonaSettingsSchema.parse(settingsInput);
	const declaredOutputs = actionOptions.data.outputs;
	const adapter = createDaytonaReactorSandbox({
		settings,
		declaredOutputs,
	});
	const timeoutMs = actionOptions.data.timeoutMs ?? 60_000;

	try {
		const run = await adapter.run({
			actionId: args.actionId,
			files: sandboxFiles({
				context: args.context,
				skillFile,
				actionFiles: executeFile ? actionOptions.data.files.concat(executeFile.file) : actionOptions.data.files,
			}),
			command,
			env: sandboxEnv({
				context: args.context,
				actionEnv: actionOptions.data.env,
			}),
			timeoutMs,
		});
		const recorded = await recordSandboxOutputs({
			ctx: args.ctx,
			owner: args.owner,
			actionId: args.actionId,
			declaredOutputs,
			outputs: run.declaredOutputs,
		});
		const succeededStatus = 'succeeded';
		const failedStatus = 'failed';

		return {
			status: run.exitCode === 0 ? succeededStatus : failedStatus,
			result: {
				text: sandboxResultText(run.stdout, run.stderr),
				files: recorded.files,
				metadata: {
					kind: 'sandbox',
					provider: 'daytona',
					runId: run.runId,
					exitCode: run.exitCode,
				},
			},
			patch: recorded.patch || undefined,
			costs: [],
			details: {
				provider: 'daytona',
				output: {
					runId: run.runId,
					exitCode: run.exitCode,
					metadata: run.metadata,
				},
			},
		};
	} catch (error: unknown) {
		return failedSandboxResult({
			text: error instanceof Error ? error.message : 'Sandbox provider failed.',
			metadata: {
				configured: true,
			},
		});
	}
}

function failedSandboxResult(args: { text: string; metadata: Record<string, unknown> }) {
	//
	return {
		status: settledActionStatusSchema.parse('failed'),
		result: {
			text: args.text,
			files: [],
			metadata: {
				kind: 'sandbox',
				provider: 'daytona',
				...args.metadata,
			},
		},
		costs: [],
		details: {
			provider: 'daytona',
			output: args.metadata,
		},
	};
}

function sandboxFiles(args: {
	context: z.infer<typeof runtimeContextSchema>;
	skillFile: z.infer<typeof sandboxInlineFileSchema> | undefined;
	actionFiles: z.infer<typeof sandboxInlineFileSchema>[];
}) {
	//
	const encoder = new TextEncoder();
	const current = [
		{
			path: '/workspace/current.md',
			content: encoder.encode(args.context.content),
		},
	];
	const configured = args.skillFile
		? [
				{
					path: args.skillFile.path,
					content: encoder.encode(args.skillFile.content),
				},
			]
		: [];
	const action = args.actionFiles.map((file) => ({
		path: file.path,
		content: encoder.encode(file.content),
	}));

	return current.concat(configured).concat(action);
}

function sandboxEnv(args: { context: z.infer<typeof runtimeContextSchema>; actionEnv: Record<string, string> }) {
	//
	return {
		...args.actionEnv,
		REACTOR_CURRENT_FILE: '/workspace/current.md',
		REACTOR_FILE_NAME: args.context.file.name,
	};
}

function sandboxSkillFile(context: z.infer<typeof runtimeContextSchema>) {
	//
	const body = context.skill?.body;
	if (!body?.trim()) return undefined;

	return sandboxInlineFileSchema.parse({
		path: `/workspace/${safeSandboxFileName(context.skill?.fileName ?? 'skill.js')}`,
		content: materializeDaytonaWorkspaceText(body),
	});
}

function safeSandboxFileName(name: string) {
	//
	const trimmed = name.trim() || 'skill.js';
	return trimmed.replace(/[^A-Za-z0-9._@+-]/g, '_');
}

function sandboxCommandFor(path: string) {
	//
	if (path.endsWith('.py')) return `python ${path}`;

	return `node ${path}`;
}

async function recordSandboxOutputs(args: {
	ctx: ActionCtx;
	owner: Doc<'users'>['_id'];
	actionId: Doc<'actions'>['_id'];
	declaredOutputs: z.infer<typeof daytonaOutputSchema>[];
	outputs: Array<{
		path: string;
		bytes: Uint8Array;
	}>;
}) {
	//
	if (args.outputs.length === 0) {
		return {
			files: [],
			patch: '',
		};
	}

	const decoder = new TextDecoder();
	const recordedOutputs: RecordedSandboxOutput[] = [];
	let adapter: ReturnType<typeof createConfiguredObjectStorageAdapter> | undefined;

	for (const output of args.outputs) {
		const contentType = declaredContentType(output.path, args.declaredOutputs);
		if (shouldStoreSandboxOutputInline({ output, contentType })) {
			recordedOutputs.push({
				path: output.path,
				content: decoder.decode(output.bytes),
				size: output.bytes.byteLength,
				contentType,
			});
			continue;
		}

		adapter ??= createConfiguredObjectStorageAdapter();
		const write = await adapter.write({
			bytes: output.bytes,
			contentType,
		});
		const pointer = objectContentPointerSchema.parse({
			kind: 'object',
			storageKey: write.key,
			size: write.size,
			contentType: write.contentType,
		});

		recordedOutputs.push({
			path: output.path,
			pointer,
			size: write.size,
			contentType: write.contentType,
		});
	}

	return recordedSandboxOutputsSchema.parse(
		await args.ctx.runMutation(internal.runtimeState._recordSandboxOutputs, {
			owner: args.owner,
			actionId: args.actionId,
			outputs: recordedOutputs,
		}),
	);
}

function declaredContentType(path: string, declaredOutputs: z.infer<typeof daytonaOutputSchema>[]) {
	//
	for (const output of declaredOutputs) {
		if (output.path === path) return output.contentType;
	}

	return undefined;
}

function shouldStoreSandboxOutputInline(args: {
	output: {
		bytes: Uint8Array;
	};
	contentType: string | undefined;
}) {
	//
	if (args.output.bytes.byteLength > env.MAX_REACTOR_INLINE_CONTENT_BYTES) return false;
	return isInlineTextContentType(args.contentType);
}

function isInlineTextContentType(contentType: string | undefined) {
	//
	if (!contentType) return true;

	const lower = contentType.toLowerCase();
	if (lower.startsWith('text/')) return true;
	if (lower === 'application/json') return true;
	if (lower === 'application/javascript') return true;
	if (lower === 'application/xml') return true;
	if (lower === 'application/x-ndjson') return true;
	if (lower.endsWith('+json')) return true;
	if (lower.endsWith('+xml')) return true;

	return false;
}

function sandboxResultText(stdout: string, stderr: string) {
	//
	const parts = [];
	if (stdout) parts.push(stdout);
	if (stderr) parts.push(`stderr:\n${stderr}`);
	if (parts.length === 0) return 'Sandbox command completed.';

	return parts.map((part) => truncate(part, 4_000)).join('\n\n');
}

function executeInlineFile(action: z.infer<typeof runtimeContextSchema>['action']) {
	//
	if (action.skillKey !== 'execute') return undefined;

	const parsed = executeCodeSchema.safeParse(action.args);
	if (!parsed.success) return undefined;

	const extension = parsed.data.language === 'python' ? 'py' : 'js';
	const path = `/workspace/action.${extension}`;
	const command = parsed.data.language === 'python' ? `python3 ${path}` : `node ${path}`;

	return {
		command,
		file: sandboxInlineFileSchema.parse({
			path,
			content: materializeDaytonaWorkspaceText(parsed.data.code),
		}),
	};
}

function normalizeSandboxPath(path: string) {
	//
	const trimmed = path.trim();
	const absolute = trimmed.startsWith('/workspace/') ? trimmed : `/workspace/${trimmed.replace(/^workspace\//, '')}`;

	if (absolute.includes('..')) return null;
	if (!/^\/workspace(?:\/[A-Za-z0-9._@+-]+)+$/.test(absolute)) return null;

	return absolute;
}

function truncate(value: string, limit: number) {
	//
	if (value.length <= limit) return value;

	return `${value.slice(0, limit)}\n... truncated`;
}

function findIntelligenceSelection(context: Pick<z.infer<typeof runtimeContextSchema>, 'action' | 'loop'>) {
	//
	const intelligenceKey = context.action.intelligenceKey;
	if (intelligenceKey?.trim()) return intelligenceKey;
	const loopDefault = context.loop?.defaultIntelligenceKey;
	if (loopDefault?.trim()) return loopDefault;

	return 'Cheap';
}

function resolveRuntimeIntelligence(args: {
	context: Pick<z.infer<typeof runtimeContextSchema>, 'action' | 'loop' | 'file'>;
}) {
	//
	const selection = findIntelligenceSelection(args.context);
	try {
		return {
			value: runtimeIntelligenceSelectionSchema.parse(
				referenceIntelligenceSelection({
					key: selection,
				}),
			),
			selection,
			error: undefined,
		};
	} catch (error) {
		return {
			value: undefined,
			selection,
			error: error instanceof Error ? error.message : `Unknown intelligence selection ${selection}`,
		};
	}
}

function estimateClaimCost(args: {
	context: z.infer<typeof runtimeContextSchema>;
	expectedCost: bigint;
	maxCost: bigint;
}) {
	//
	if (args.maxCost > 0n) {
		return {
			expectedCost: args.expectedCost,
			maxCost: args.maxCost,
		};
	}

	if (args.expectedCost > 0n) {
		return {
			expectedCost: args.expectedCost,
			maxCost: withPredictionMargin(args.expectedCost),
		};
	}

	const skillKind = args.context.skill?.kind;
	if (skillKind !== 'soft' && args.context.action.skillKey !== 'think') {
		return {
			expectedCost: 0n,
			maxCost: 0n,
		};
	}

	const resolvedIntelligence = resolveRuntimeIntelligence({
		context: args.context,
	});
	if (!resolvedIntelligence.value) {
		return {
			expectedCost: 0n,
			maxCost: 0n,
		};
	}
	const cost = estimateIntelligenceCost({
		intelligence: resolvedIntelligence.value.intelligence,
		inputTokens: estimateTokens(buildIntelligenceContext(args.context)),
		outputTokens: 1024,
	});
	const expectedCost = cost?.amount ?? 0n;

	return {
		expectedCost,
		maxCost: withPredictionMargin(expectedCost),
	};
}

function estimateTokens(text: string) {
	//
	return Math.max(1, Math.ceil(text.length / env.CHAR_PER_TOKEN));
}

function withPredictionMargin(amount: bigint) {
	//
	if (amount <= 0n) return 0n;

	return amount + (amount * BigInt(env.COST_PREDICTION_MARGIN)) / 100n;
}

function buildIntelligenceContext(context: z.infer<typeof runtimeContextSchema>) {
	//
	const latestMessage = latestUserMessage(context.recentActions);
	const sections = [
		`File: ${context.file.name}`,
		`Skill: ${context.action.skillKey}`,
		`Tags: ${context.tags.map((tag) => `${tag.key}=${tag.value}`).join(', ')}`,
	];
	if (latestMessage) sections.push(`Latest user message:\n${latestMessage}`);
	sections.push(
		`Content:\n${context.content}`,
		`Args:\n${stringifyForIntelligence(intelligenceVisibleActionArgs(context.action.args))}`,
		`Recent actions:\n${context.recentActions.map(summarizeRecentAction).join('\n')}`,
	);

	return sections.join('\n\n');
}

function latestUserMessage(values: Record<string, unknown>[]) {
	//
	for (const value of values) {
		const parsed = recentActionContextSchema.safeParse(value);
		if (!parsed.success) continue;
		if (parsed.data.skillKey !== 'say') continue;

		const message = stringMetadata(parsed.data.args, 'message') ?? stringMetadata(parsed.data.args, 'text');
		if (message) return truncate(message, 1000);
	}

	return undefined;
}

function summarizeRecentAction(value: Record<string, unknown>) {
	//
	const parsed = recentActionContextSchema.safeParse(value);
	if (!parsed.success) return '- action unavailable';

	const action = parsed.data;
	const resultText = action.result?.text?.trim();
	const result = resultText ? ` result=${JSON.stringify(truncate(resultText, 800))}` : '';
	const seekState = stringMetadata(action.result?.metadata, 'seekState');
	const state = seekState ? ` seekState=${seekState}` : '';
	const costs =
		action.costs.length > 0 ? ` costs=${action.costs.map((cost) => cost.amount.toString()).join('+')}` : '';
	const args = summarizeActionArgs(action.args);

	return `- #${action.index} ${action.skillKey} status=${action.status} depth=${action.depth}${state}${args}${result}${costs}`;
}

function summarizeActionArgs(value: Record<string, unknown> | undefined) {
	//
	if (!value) return '';

	const message = stringMetadata(value, 'message') ?? stringMetadata(value, 'text');
	if (message) return ` args=${JSON.stringify({ message: truncate(message, 280) })}`;

	const keys = Object.keys(value).filter((key) => !isInternalActionArg(key));
	if (keys.length === 0) return '';

	return ` argsKeys=${keys.slice(0, 8).join(',')}`;
}

function intelligenceVisibleActionArgs(value: Record<string, unknown>) {
	//
	const visible: Record<string, unknown> = {};
	const message = stringMetadata(value, 'message') ?? stringMetadata(value, 'text');
	if (message) {
		visible['message'] = truncate(message, 1000);
	}

	return visible;
}

function isInternalActionArg(key: string) {
	//
	return key === 'trigger' || key === 'maxDepth' || key === 'settings';
}

function stringMetadata(value: Record<string, unknown> | undefined, key: string) {
	//
	const item = value?.[key];
	return typeof item === 'string' ? item : undefined;
}

function stringifyForIntelligence(value: unknown) {
	//
	return (
		JSON.stringify(
			value,
			(_key: string, item: unknown) => {
				if (typeof item === 'bigint') return item.toString();
				return item;
			},
			2,
		) ?? ''
	);
}

function extractOutputText(output: Array<Record<string, unknown>>) {
	//
	const parts = [];

	for (const item of output) {
		const parsed = openAiMessageSchema.safeParse(item);
		if (!parsed.success) continue;

		for (const content of parsed.data.content) {
			parts.push(content.text);
		}
	}

	return parts.join('\n');
}

function extractReasoningSummaries(output: Array<Record<string, unknown>>) {
	//
	const summaries = [];

	for (const item of output) {
		const parsed = openAiReasoningSchema.safeParse(item);
		if (!parsed.success) continue;

		for (const summary of parsed.data.summary) {
			summaries.push(summary.text);
		}
	}

	return summaries;
}
