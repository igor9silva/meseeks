import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Doc } from 'convex/_generated/dataModel';
import { preparationActionDetailSchema } from './actionDetailSchema';
import { newActionSchema, resolvedActionStatusSchema } from './actionSchema';
import { fileRevisionChangeKindSchema } from './fileRevisionSchema';
import {
	decisionConfigSchema,
	executeConfigSchema,
	httpConfigSchema,
	skillKeySchema,
	skillKindSchema,
	skillSourceSchema,
} from './skillSchema';

export const performArgsSchema = z.object({
	action: zid('actions'),
});

export const claimedSkillSchema = z.object({
	source: skillSourceSchema,
	key: skillKeySchema,
	kind: skillKindSchema,
	config: z.record(z.unknown()).optional(),
	inputSchema: z.string(),
	outputSchema: z.string(),
});

export const stagedTextSchema = z.object({
	content: z.string(),
	contentType: z.string().min(1),
	hash: z.string().min(1),
	size: z.number().int().min(0),
	storageKey: z.string().min(1),
});

export const storedBodySchema = z.object({
	contentType: z.string().min(1),
	hash: z.string().min(1),
	size: z.number().int().min(0),
	storageKey: z.string().min(1),
});

export const fileMutationSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('createDirectory'),
		parent: zid('files'),
		name: z.string().min(1),
	}),
	z.object({
		kind: z.literal('createFile'),
		parent: zid('files'),
		name: z.string().min(1),
		body: storedBodySchema,
	}),
	z.object({
		kind: z.literal('createText'),
		parent: zid('files'),
		name: z.string().min(1),
		body: stagedTextSchema,
	}),
	z.object({
		kind: z.literal('createTextAtPath'),
		parent: zid('files'),
		path: z.array(z.string().min(1)).min(1),
		body: stagedTextSchema,
	}),
	z.object({
		kind: z.literal('writeText'),
		file: zid('files'),
		beforeContent: z.string(),
		expectedRevision: zid('file_revisions').optional(),
		body: stagedTextSchema,
	}),
	z.object({
		kind: z.literal('move'),
		file: zid('files'),
		parent: zid('files').optional(),
		name: z.string().min(1).optional(),
	}),
	z.object({
		kind: z.literal('tag'),
		file: zid('files'),
		key: z.string().min(1),
		value: z.string().optional(),
	}),
	z.object({
		kind: z.literal('untag'),
		file: zid('files'),
		key: z.string().min(1),
	}),
]);

export const providerReceiptSchema = z.object({
	provider: z.string().min(1),
	model: z.string().optional(),
	request: z.record(z.unknown()).optional(),
	response: z.record(z.unknown()).optional(),
	usage: z.record(z.unknown()).optional(),
});

export const uploadTicketSchema = z.object({
	ticketAction: zid('actions'),
	parent: zid('files'),
	name: z.string().min(1),
	contentType: z.string().min(1),
	size: z.number().int().min(0),
	hash: z.string().min(1),
	checksum: z.string().min(1),
	stagedStorageKey: z.string().min(1),
	uploadUrl: z.string().url(),
	expiresAt: z.number(),
});

export const triggerMutationSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('disableTrigger'),
		trigger: zid('triggers'),
	}),
]);

const compiledSkillProjectionBaseSchema = z.object({
	key: skillKeySchema,
	description: z.string().min(1),
	inputSchema: z.string().min(1),
	outputSchema: z.string().min(1),
	sourceFile: zid('files'),
	sourcePath: z.string().min(1),
	sourceHash: z.string().optional(),
});

export const compiledSkillProjectionSchema = z.discriminatedUnion('kind', [
	compiledSkillProjectionBaseSchema.extend({
		kind: z.literal('think'),
		config: decisionConfigSchema,
	}),
	compiledSkillProjectionBaseSchema.extend({
		kind: z.literal('request'),
		config: httpConfigSchema,
	}),
	compiledSkillProjectionBaseSchema.extend({
		kind: z.literal('execute'),
		config: executeConfigSchema,
	}),
]);

export const compiledPageProjectionSchema = z.object({
	file: zid('files'),
	route: z.string().min(1),
	sourcePath: z.string().min(1),
	sourceHash: z.string().optional(),
	diagnostics: z.array(z.string()).optional(),
});

export const compiledTriggerProjectionSchema = z.object({
	kind: z.literal('mutation'),
	events: z.array(fileRevisionChangeKindSchema).min(1),
	pattern: z.string().optional(),
	reactions: z.array(newActionSchema).min(1).max(5),
	maxUses: z.number().int().positive().optional(),
	sourceFile: zid('files'),
	sourcePath: z.string().min(1),
	sourceHash: z.string().optional(),
});

export const compileMutationSchema = z.object({
	kind: z.literal('compile'),
	skills: z.array(compiledSkillProjectionSchema),
	pages: z.array(compiledPageProjectionSchema),
	triggers: z.array(compiledTriggerProjectionSchema),
	diagnostics: z.array(z.string()),
});

export const performResultSchema = z.object({
	action: zid('actions'),
	status: resolvedActionStatusSchema,
	output: stagedTextSchema.optional(),
	fileMutations: z.array(fileMutationSchema).optional(),
	triggerMutations: z.array(triggerMutationSchema).optional(),
	compileMutations: z.array(compileMutationSchema).optional(),
	reactions: z.array(newActionSchema).optional(),
	providerReceipt: providerReceiptSchema.optional(),
	uploadTicket: uploadTicketSchema.optional(),
	error: z.string().optional(),
	warnings: z.array(z.string()).optional(),
});

export type ClaimedSkill = z.infer<typeof claimedSkillSchema>;
export type StagedText = z.infer<typeof stagedTextSchema>;
export type StoredBody = z.infer<typeof storedBodySchema>;
export type FileMutation = z.infer<typeof fileMutationSchema>;
export type TriggerMutation = z.infer<typeof triggerMutationSchema>;
export type CompileMutation = z.infer<typeof compileMutationSchema>;
export type ProviderReceipt = z.infer<typeof providerReceiptSchema>;
export type UploadTicket = z.infer<typeof uploadTicketSchema>;
export type PerformResult = z.infer<typeof performResultSchema>;

export type ClaimedAction = {
	action: Doc<'actions'>;
	input: Record<string, unknown>;
	preparation: z.infer<typeof preparationActionDetailSchema>;
	skill: ClaimedSkill;
	warnings: Array<string>;
};
