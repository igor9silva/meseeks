'use node';

import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { action, internalAction } from 'lib/convex';
import { Unauthorized } from 'lib/errors';
import { evaluateTriggerCode } from 'lib/triggerIsolate';
import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import type { ActionCtx } from './_generated/server';

const isolateTriggerSchema = z.object({
	trigger: zid('triggers'),
	kind: z.enum(['file', 'loop']),
	handler: zid('files'),
	handlerCode: z.string().min(1),
	maxUses: z.number().int().nonnegative(),
	uses: z.number().int().nonnegative(),
	file: zid('files').optional(),
	loop: zid('loops').optional(),
});

const isolateContextSchema = z.object({
	action: z
		.object({
			_id: zid('actions'),
			file: zid('files'),
			skillKey: z.string(),
			args: z.record(z.unknown()),
			resultFile: zid('files').optional(),
		})
		.passthrough(),
	triggers: z.array(isolateTriggerSchema),
});

const isolateProposalSchema = z.object({
	trigger: zid('triggers'),
	skillKey: z.string().min(1),
	args: z.record(z.unknown()).default({}),
	loop: zid('loops').nullable().optional(),
});

type EvaluationResult = {
	proposals: number;
	accepted: number;
};

export const _evaluate = internalAction({
	args: {
		owner: zid('users'),
		actionId: zid('actions'),
	},
	handler: async (ctx, { owner, actionId }): Promise<EvaluationResult> =>
		await evaluateAndSchedule(ctx, { owner, actionId }),
});

export const evaluate = action({
	args: {
		actionId: zid('actions'),
	},
	handler: async (ctx, { actionId }) => {
		//
		const currentUser = await currentActionUser(ctx);
		return await evaluateAndSchedule(ctx, {
			owner: currentUser._id,
			actionId,
		});
	},
});

async function evaluateAndSchedule(
	ctx: ActionCtx,
	args: { owner: Doc<'users'>['_id']; actionId: Doc<'actions'>['_id'] },
): Promise<EvaluationResult> {
	//
	const context = isolateContextSchema.parse(
		await ctx.runQuery(internal.triggerIsolateState._context, {
			owner: args.owner,
			actionId: args.actionId,
		}),
	);
	const proposals = [];

	for (const trigger of context.triggers) {
		const triggerProposals = await evaluateOneTriggerOrEmpty({
			trigger,
			context: {
				action: context.action,
				trigger: publicTriggerContext(trigger),
			},
		});
		proposals.push(...triggerProposals);
	}

	const accepted = z
		.number()
		.int()
		.nonnegative()
		.parse(
			await ctx.runMutation(internal.triggerIsolateState._acceptProposals, {
				owner: args.owner,
				source: {
					kind: 'action',
					actionId: args.actionId,
				},
				proposals,
			}),
		);

	return {
		proposals: proposals.length,
		accepted,
	};
}

async function evaluateOneTriggerOrEmpty(args: {
	trigger: z.infer<typeof isolateTriggerSchema>;
	context: Record<string, unknown>;
}) {
	//
	try {
		return await evaluateOneTrigger(args);
	} catch (error) {
		console.warn('trigger handler failed', {
			trigger: args.trigger.trigger,
			message: error instanceof Error ? error.message : 'unknown error',
		});
		return [];
	}
}

async function evaluateOneTrigger(args: {
	trigger: z.infer<typeof isolateTriggerSchema>;
	context: Record<string, unknown>;
}) {
	//
	const evaluated = await evaluateTriggerCode({
		code: args.trigger.handlerCode,
		context: args.context,
		timeoutMs: 1000,
	});
	const proposals = [];

	for (const proposal of evaluated.proposals) {
		const parsedLoop = proposal.loop ? zid('loops').safeParse(proposal.loop) : undefined;
		proposals.push(
			isolateProposalSchema.parse({
				trigger: args.trigger.trigger,
				skillKey: proposal.skillKey,
				args: proposal.args,
				loop: parsedLoop?.success ? parsedLoop.data : proposal.loop === null ? null : undefined,
			}),
		);
	}

	return proposals;
}

function publicTriggerContext(trigger: z.infer<typeof isolateTriggerSchema>) {
	//
	return {
		id: trigger.trigger,
		kind: trigger.kind,
		handler: trigger.handler,
		maxUses: trigger.maxUses,
		uses: trigger.uses,
		file: trigger.file,
		loop: trigger.loop,
	};
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
