import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internalMutation, internalQuery, query } from 'lib/convex';
import {
	findActionTriggerFiles,
	findMutationTriggerFiles,
	findTriggerFiles,
	getTriggerFileAuthor,
	listTriggers as listTriggersHelper,
	upsertTrigger,
} from './triggers.private';

export const listTriggers = query({
	args: {
		directory: zid('files'),
	},
	handler: listTriggersHelper,
});

// called by reactor to discover direct directory trigger files.
export const _findTriggerFiles = internalQuery({
	args: {
		owner: zid('users'),
		directory: zid('files'),
	},
	handler: findTriggerFiles,
});

// called by reactor after non-mutating actions to discover action triggers.
export const _findActionTriggerFiles = internalQuery({
	args: {
		owner: zid('users'),
		directory: zid('files'),
	},
	handler: findActionTriggerFiles,
});

// called by reactor after committed mutations to discover mutation triggers.
export const _findMutationTriggerFiles = internalQuery({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		changedPaths: z.array(z.string()),
	},
	handler: findMutationTriggerFiles,
});

// called by reactor trigger evaluation so trigger authorship follows the file write action.
export const _getTriggerFileAuthor = internalQuery({
	args: {
		owner: zid('users'),
		sourceFile: zid('files'),
	},
	handler: getTriggerFileAuthor,
});

// called by reactor trigger evaluation to refresh compiled trigger runtime state.
export const _upsertTrigger = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		sourceFile: zid('files'),
		path: z.string().min(1),
		hash: z.string().min(1),
		status: z.enum(['indexed', 'failed']),
		author: z.discriminatedUnion('kind', [
			z.object({
				kind: z.literal('user'),
				user: zid('users'),
			}),
			z.object({
				kind: z.literal('action'),
				action: zid('actions'),
			}),
		]),
		trigger: z.discriminatedUnion('kind', [
			z.object({
				kind: z.literal('mutation'),
			}),
			z.object({
				kind: z.literal('action'),
			}),
			z.object({
				kind: z.literal('code'),
			}),
		]),
		config: z
			.object({
				maxUses: z.number().positive().optional(),
				timeoutMs: z.number().positive().optional(),
				maxProposals: z.number().nonnegative().optional(),
			})
			.optional(),
		lastError: z.string().optional(),
		didRun: z.boolean().default(false),
	},
	handler: upsertTrigger,
});
