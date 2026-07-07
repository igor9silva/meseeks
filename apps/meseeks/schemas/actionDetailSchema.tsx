import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { newActionSchema } from './actionSchema';
import { intelligenceKeys } from './intelligenceSchema';
import { skillKeySchema } from './skillSchema';

const coreActionDetailSchema = z.object({
	owner: zid('users'),
	action: zid('actions'),
	createdAt: z.number(),
});

export const providerActionDetailSchema = coreActionDetailSchema.extend({
	kind: z.literal('provider'),
	provider: z.string().min(1),
	model: z.string().optional(),
	request: z.record(z.unknown()).optional(),
	response: z.record(z.unknown()).optional(),
	usage: z.record(z.unknown()).optional(),
	cost: z.bigint().optional(),
});

export const boxActionDetailSchema = coreActionDetailSchema.extend({
	kind: z.literal('box'),
	provider: z.literal('daytona'),
	providerBoxId: z.string().min(1),
	command: z.string().optional(),
	exitCode: z.number().int().optional(),
	stdout: z.string().optional(),
	stderr: z.string().optional(),
	logs: z.string().optional(),
	changedPaths: z.array(z.string()).optional(),
});

export const triggerActionDetailSchema = coreActionDetailSchema.extend({
	kind: z.literal('trigger'),
	trigger: zid('triggers').optional(),
	sourceFile: zid('files').optional(),
	sourcePath: z.string().optional(),
	sourceHash: z.string().optional(),
	sourceAction: zid('actions').optional(),
	compiledBy: zid('actions').optional(),
	compiledAt: z.number().optional(),
	matchedRevisions: z.array(zid('file_revisions')).optional(),
	matchedPaths: z.array(z.string()).optional(),
	proposals: z.array(newActionSchema).optional(),
	acceptedActions: z.array(zid('actions')).optional(),
	error: z.string().optional(),
});

export const reactionActionDetailSchema = coreActionDetailSchema.extend({
	kind: z.literal('reaction'),
	proposals: z.array(newActionSchema),
	acceptedActions: z.array(zid('actions')),
});

export const fileActionDetailSchema = coreActionDetailSchema.extend({
	kind: z.literal('file'),
	file: zid('files').optional(),
	revisions: z.array(zid('file_revisions')).optional(),
	paths: z.array(z.string()).optional(),
	warnings: z.array(z.string()).optional(),
});

export const uploadActionDetailSchema = coreActionDetailSchema.extend({
	kind: z.literal('upload'),
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

export const errorActionDetailSchema = coreActionDetailSchema.extend({
	kind: z.literal('error'),
	code: z.string().optional(),
	message: z.string().min(1),
	stack: z.string().optional(),
});

const preparationCoreSchema = coreActionDetailSchema.extend({
	kind: z.literal('preparation'),
	skill: skillKeySchema,
	preparedAt: z.number(),
	warnings: z.array(z.string()).optional(),
});

export const thinkPreparationActionDetailSchema = preparationCoreSchema.extend({
	skillKind: z.literal('think'),
	intelligence: intelligenceKeys,
	provider: z.string().min(1),
	model: z.string().min(1),
	system: z.string().min(1),
	prompt: z.string().min(1),
	estimated: z.record(z.unknown()).optional(),
});

export const requestPreparationActionDetailSchema = preparationCoreSchema.extend({
	skillKind: z.literal('request'),
	url: z.string().url(),
	method: z.enum([
		'GET', //
		'POST',
		'PUT',
		'PATCH',
		'DELETE',
	]),
	headers: z.record(z.string()).optional(),
	body: z.unknown().optional(),
	timeoutMs: z.number().int().positive().optional(),
});

export const executePreparationActionDetailSchema = preparationCoreSchema.extend({
	skillKind: z.literal('execute'),
	root: zid('files'),
	code: z.string().min(1),
	language: z.enum([
		'javascript', //
		'python',
	]),
	timeoutSeconds: z.number().int().positive().optional(),
});

export const instinctPreparationActionDetailSchema = preparationCoreSchema.extend({
	skillKind: z.literal('instinct'),
	context: z.record(z.unknown()).optional(),
});

export const preparationActionDetailSchema = z.discriminatedUnion('skillKind', [
	thinkPreparationActionDetailSchema,
	requestPreparationActionDetailSchema,
	executePreparationActionDetailSchema,
	instinctPreparationActionDetailSchema,
]);

export const actionDetailSchema = z
	.union([
		thinkPreparationActionDetailSchema,
		requestPreparationActionDetailSchema,
		executePreparationActionDetailSchema,
		instinctPreparationActionDetailSchema,
		providerActionDetailSchema,
		boxActionDetailSchema,
		triggerActionDetailSchema,
		reactionActionDetailSchema,
		fileActionDetailSchema,
		uploadActionDetailSchema,
		errorActionDetailSchema,
	])
	.describe('Technical detail for action execution.');
