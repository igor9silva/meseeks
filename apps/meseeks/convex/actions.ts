import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internalMutation, internalQuery, query } from 'lib/convex';
import { actionAuthorSchema, actionDetailSchema, actionProposalSchema } from 'schemas/workspaceSchema';
import {
	claimAndScheduleNext,
	finishAction,
	getRunnableAction,
	listActionDetails as listActionDetailsHelper,
	listActions as listActionsHelper,
	recordDetail,
	scheduleProposalAction,
	startAction,
} from './actions.private';
import { getCurrentUser } from './users.private';

// called by reactor to attribute user-authored actions without duplicating auth code.
export const _getCurrentUser = internalQuery({
	args: {},
	handler: async (ctx) => await getCurrentUser(ctx, {}),
});

export const listActions = query({
	args: {
		directory: zid('files'),
	},
	handler: listActionsHelper,
});

export const listActionDetails = query({
	args: {
		action: zid('actions'),
	},
	handler: listActionDetailsHelper,
});

// called by reactor act to create the durable ledger row before execution.
export const _startAction = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
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
		depth: z.number().int().nonnegative().default(0),
		skillKey: z.string().min(1),
		loopKey: z.string().optional(),
		intelligenceKey: z.string().optional(),
		args: z.record(z.unknown()).default({}),
	},
	handler: startAction,
});

// called by reactor after each action settles to persist lifecycle state.
export const _finishAction = internalMutation({
	args: {
		action: zid('actions'),
		status: z.enum(['succeeded', 'failed', 'skipped']),
		result: zid('files').optional(),
		error: z.string().optional(),
	},
	handler: finishAction,
});

// called by scheduled reactor actions to load the action about to run.
export const _getRunnableAction = internalQuery({
	args: {
		action: zid('actions'),
	},
	handler: getRunnableAction,
});

// called by reactor to serialize queued trigger proposals per directory.
export const _claimAndScheduleNext = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
	},
	returns: z
		.object({
			action: zid('actions'),
			scheduledFunctionId: zid('_scheduled_functions'),
		})
		.nullable(),
	handler: claimAndScheduleNext,
});

// called by reactor provider and trigger paths to persist technical receipts.
export const _recordDetail = internalMutation({
	args: {
		detail: actionDetailSchema,
	},
	handler: recordDetail,
});

// called by trigger evaluation to turn accepted proposals into normal actions.
export const _scheduleProposalAction = internalMutation({
	args: {
		owner: zid('users'),
		directory: zid('files'),
		sourceAction: zid('actions'),
		trigger: zid('triggers'),
		depth: z.number().int().nonnegative(),
		proposal: actionProposalSchema,
	},
	handler: scheduleProposalAction,
});
