import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';

const metadataSchema = z.record(z.string());

const costSchema = z.object({
	amount: z.number().nonnegative(),
	currency: z.literal('chip').default('chip'),
});

export const fileKindSchema = z.enum(['file', 'folder']);

export const fileSchema = z.object({
	owner: zid('users'),
	parent: zid('files').optional(),
	name: z.string().min(1),
	path: z.string().min(1),
	kind: fileKindSchema,
	currentRevision: zid('file_revisions').optional(),
	contentType: z.string().optional(),
	hash: z.string().optional(),
	size: z.number().nonnegative().optional(),
	title: z.string().optional(),
	availableSkillKeys: z.array(z.string().min(1)).max(16).optional(),
	budgetTotal: z.number().nonnegative().optional(),
	budgetAvailable: z.number().nonnegative().optional(),
	budgetReserved: z.number().nonnegative().optional(),
	storageReserve: z.number().nonnegative().optional(),
	isDeleted: z.boolean(),
	metadata: metadataSchema.optional(),
	createdAt: z.number(),
	updatedAt: z.number(),
});

export const fileTagSchema = z.object({
	owner: zid('users'),
	file: zid('files'),
	key: z.string().min(1),
	value: z.string().optional(),
	createdAt: z.number(),
	updatedAt: z.number(),
});

export const fileRevisionSchema = z.object({
	owner: zid('users'),
	file: zid('files'),
	directory: zid('files'),
	action: zid('actions'),
	changeset: zid('changesets').optional(),
	previousRevision: zid('file_revisions').optional(),
	content: z.string().optional(),
	storageKey: z.string().min(1).optional(),
	patchStorageKey: z.string().min(1).optional(),
	patch: z.string().optional(),
	beforePath: z.string().optional(),
	afterPath: z.string().optional(),
	changeKind: z.enum(['created', 'updated', 'deleted', 'renamed', 'metadata', 'tagged']),
	patchKind: z.enum(['text', 'binary', 'full', 'metadata']),
	contentType: z.string().optional(),
	hash: z.string(),
	size: z.number().nonnegative(),
	beforeHash: z.string().optional(),
	afterHash: z.string().optional(),
	beforeSize: z.number().nonnegative().optional(),
	afterSize: z.number().nonnegative().optional(),
	createdAt: z.number(),
});

export const changedPathSchema = z.object({
	path: z.string().min(1),
	file: zid('files').optional(),
	beforeRevision: zid('file_revisions').optional(),
	afterRevision: zid('file_revisions').optional(),
	beforeContent: z.string().optional(),
	afterContent: z.string().optional(),
	beforeMetadata: metadataSchema.optional(),
	afterMetadata: metadataSchema.optional(),
});

export const renamedPathSchema = z.object({
	fromPath: z.string().min(1),
	toPath: z.string().min(1),
	file: zid('files').optional(),
	beforeRevision: zid('file_revisions').optional(),
	afterRevision: zid('file_revisions').optional(),
	beforeContent: z.string().optional(),
	afterContent: z.string().optional(),
	beforeMetadata: metadataSchema.optional(),
	afterMetadata: metadataSchema.optional(),
});

export const changesetReviewStateSchema = z.enum(['applied', 'reviewed', 'reverted']);

export const changesetSchema = z.object({
	owner: zid('users'),
	directory: zid('files'),
	action: zid('actions'),
	created: z.array(changedPathSchema),
	updated: z.array(changedPathSchema),
	deleted: z.array(changedPathSchema),
	renamed: z.array(renamedPathSchema),
	reviewState: changesetReviewStateSchema,
	createdAt: z.number(),
	updatedAt: z.number(),
});

export const actionAuthorSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('user'),
		user: zid('users'),
	}),
	z.object({
		kind: z.literal('action'),
		action: zid('actions'),
	}),
]);

export const triggerAuthorSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('user'),
		user: zid('users'),
	}),
	z.object({
		kind: z.literal('action'),
		action: zid('actions'),
	}),
]);

export const actionStatusSchema = z.enum(['enqueued', 'running', 'succeeded', 'failed', 'skipped']);

export const actionSchema = z.object({
	owner: zid('users'),
	directory: zid('files'),
	index: z.number().int().nonnegative(),
	author: actionAuthorSchema,
	cause: z
		.discriminatedUnion('kind', [
			z.object({
				kind: z.literal('action'),
				action: zid('actions'),
			}),
			z.object({
				kind: z.literal('trigger'),
				trigger: zid('triggers'),
				sourceAction: zid('actions').optional(),
			}),
			z.object({
				kind: z.literal('boxTransaction'),
				detail: zid('action_details'),
			}),
		])
		.optional(),
	spark: zid('actions').optional(),
	depth: z.number().int().nonnegative(),
	skillKey: z.string().min(1),
	loopKey: z.string().optional(),
	intelligenceKey: z.string().optional(),
	args: z.record(z.unknown()),
	status: actionStatusSchema,
	result: zid('files').optional(),
	error: z.string().optional(),
	changeset: zid('changesets').optional(),
	budgetFile: zid('files').optional(),
	reservedBudget: z.number().nonnegative().optional(),
	expectedCost: costSchema.optional(),
	maxCost: costSchema.optional(),
	costs: z.array(costSchema).optional(),
	scheduledFunctionId: zid('_scheduled_functions').optional(),
	claimedAt: z.number().optional(),
	startedAt: z.number().optional(),
	settledAt: z.number().optional(),
	interruptedAt: z.number().optional(),
	createdAt: z.number(),
	updatedAt: z.number(),
});

const usageSchema = z.object({
	inputTokens: z.number().nonnegative().optional(),
	outputTokens: z.number().nonnegative().optional(),
	totalTokens: z.number().nonnegative().optional(),
	costUSD: z.number().nonnegative().optional(),
});

export const actionDetailSchema = z.discriminatedUnion('kind', [
	z.object({
		action: zid('actions'),
		owner: zid('users'),
		directory: zid('files'),
		kind: z.literal('think'),
		provider: z.string().min(1),
		model: z.string().min(1),
		prompt: z.string(),
		output: z.string().optional(),
		usage: usageSchema.optional(),
		warnings: z.array(z.string()).optional(),
		createdAt: z.number(),
	}),
	z.object({
		action: zid('actions'),
		owner: zid('users'),
		directory: zid('files'),
		kind: z.literal('execute'),
		provider: z.literal('daytona'),
		box: zid('boxes').optional(),
		providerSandboxId: z.string().optional(),
		command: z.string(),
		exitCode: z.number().optional(),
		stdout: z.string().optional(),
		stderr: z.string().optional(),
		changedFiles: z.array(z.string()),
		warnings: z.array(z.string()).optional(),
		createdAt: z.number(),
	}),
	z.object({
		action: zid('actions'),
		owner: zid('users'),
		directory: zid('files'),
		kind: z.literal('trigger'),
		trigger: zid('triggers').optional(),
		sourceFile: zid('files').optional(),
		proposals: z.array(z.record(z.unknown())),
		error: z.string().optional(),
		createdAt: z.number(),
	}),
	z.object({
		action: zid('actions'),
		owner: zid('users'),
		directory: zid('files'),
		kind: z.literal('warning'),
		message: z.string(),
		createdAt: z.number(),
	}),
]);

const triggerConfigSchema = z
	.object({
		maxUses: z.number().positive().optional(),
		timeoutMs: z.number().positive().optional(),
		maxProposals: z.number().nonnegative().optional(),
	})
	.optional();

export const triggerKindSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('mutation'),
		operations: z.array(z.enum(['created', 'updated', 'deleted'])).optional(),
	}),
	z.object({
		kind: z.literal('action'),
		skillKey: z.string().optional(),
	}),
	z.object({
		kind: z.literal('schedule'),
		cron: z.string().optional(),
		nextRunAt: z.number().optional(),
	}),
	z.object({
		kind: z.literal('code'),
		events: z.array(z.enum(['action', 'mutation', 'schedule'])).optional(),
	}),
]);

export const triggerSchema = z.object({
	owner: zid('users'),
	directory: zid('files'),
	sourceFile: zid('files').optional(),
	path: z.string().min(1),
	hash: z.string().optional(),
	status: z.enum(['indexed', 'failed']),
	author: triggerAuthorSchema,
	trigger: triggerKindSchema,
	config: triggerConfigSchema,
	lastError: z.string().optional(),
	lastRunAt: z.number().optional(),
	runCount: z.number().int().nonnegative(),
	createdAt: z.number(),
	updatedAt: z.number(),
});

export const boxSchema = z.object({
	owner: zid('users'),
	directory: zid('files'),
	provider: z.literal('daytona'),
	providerSandboxId: z.string().optional(),
	status: z.enum(['idle', 'running', 'failed']),
	lastAction: zid('actions').optional(),
	lastLogs: z.string().optional(),
	lastChangedFiles: z.array(z.string()).optional(),
	lifecycle: metadataSchema.optional(),
	createdAt: z.number(),
	updatedAt: z.number(),
});

export const actionProposalSchema = z.object({
	skillKey: z.string().min(1),
	directory: zid('files').optional(),
	intelligenceKey: z.string().optional(),
	args: z.record(z.unknown()).default({}),
});
