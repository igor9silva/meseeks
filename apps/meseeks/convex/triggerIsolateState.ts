import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { internalMutation, internalQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { internal } from './_generated/api';
import { catFile, ensureFileOwner } from './files.private';
import { findLoopByKey, isLoopVisibleToOwner } from './loops.private';
import { enqueueTriggerAction } from './reactor.private';
import { isTriggerEligible } from './triggers.private';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

const isolateProposalSchema = z.object({
	trigger: zid('triggers'),
	skillKey: z.string().min(1),
	args: z.record(z.unknown()).default({}),
	loop: zid('loops').nullable().optional(),
});

const proposalSourceSchema = z.union([
	z.object({
		kind: z.literal('action'),
		actionId: zid('actions'),
	}),
	z.object({
		kind: z.literal('endpoint'),
		file: zid('files'),
	}),
]);

export const _context = internalQuery({
	args: {
		owner: zid('users'),
		actionId: zid('actions'),
	},
	handler: async (ctx, { owner, actionId }) => {
		//
		const action = await ctx.db.get(actionId);
		if (!action || action.owner !== owner) throw NotFound();
		if (action.interruptedAt !== undefined || action.status !== 'succeeded') {
			return {
				action,
				triggers: [],
			};
		}

		return {
			action,
			triggers: await triggerContextsForAction(ctx, {
				owner,
				action,
			}),
		};
	},
});

export const _endpointContext = internalQuery({
	args: {
		owner: zid('users'),
		triggerId: zid('triggers'),
		file: zid('files'),
	},
	handler: async (ctx, { owner, triggerId, file }) => {
		//
		await ensureFileOwner(ctx, { owner, fileId: file });
		const trigger = await ctx.db.get(triggerId);
		if (!trigger || trigger.owner !== owner || !isTriggerEligible(trigger)) throw NotFound();
		if (trigger.kind !== 'file' || trigger.file !== file) throw NotFound();

		return {
			trigger: await triggerContext(ctx, { owner, trigger }),
		};
	},
});

export const _acceptProposals = internalMutation({
	args: {
		owner: zid('users'),
		source: proposalSourceSchema,
		proposals: z.array(isolateProposalSchema),
	},
	handler: async (ctx, { owner, source, proposals }) => {
		//
		const target = await deriveTriggerTarget(ctx, { owner, source });
		if (!target) return 0;

		let accepted = 0;
		const acceptedTriggers = new Set<Id<'triggers'>>();
		for (const proposal of proposals) {
			const trigger = await ctx.db.get(proposal.trigger);
			if (!trigger || !isTriggerEligible(trigger)) continue;
			if (!doesTriggerApplyToTarget({ trigger, target })) continue;
			if (!isTriggerVisibleForTarget({ trigger, target, owner })) continue;

			const loop = selectedLoop({ proposal, trigger, target });
			const loopRecord = loop ? await ctx.db.get(loop) : undefined;
			if (loopRecord && !isLoopVisibleToOwner({ loop: loopRecord, owner })) continue;
			const actionArgs = actionArgsForProposal({
				args: proposal.args,
				trigger: proposal.trigger,
			});

			const actionId = await enqueueTriggerAction(ctx, {
				owner,
				file: target.file,
				triggerId: proposal.trigger,
				skillKey: proposal.skillKey,
				args: actionArgs,
				loopKey: loopRecord?.key,
				intelligenceKey: target.intelligenceKey ?? loopRecord?.defaultIntelligenceKey,
			});
			await ctx.scheduler.runAfter(0, internal.runtime._perform, {
				owner,
				actionId,
			});
			accepted += 1;
			acceptedTriggers.add(proposal.trigger);
		}

		for (const triggerId of acceptedTriggers) {
			const trigger = await ctx.db.get(triggerId);
			if (!trigger) continue;
			await ctx.db.patch(triggerId, {
				uses: trigger.uses + 1,
				updatedAt: Date.now(),
			});
		}

		return accepted;
	},
});

async function triggerContextsForAction(
	ctx: QueryCtx,
	args: {
		owner: Id<'users'>;
		action: Doc<'actions'>;
	},
) {
	//
	const triggers = await eligibleTriggersForAction(ctx, args);
	const contexts = [];

	for (const trigger of triggers) {
		contexts.push(await triggerContext(ctx, { owner: args.owner, trigger }));
	}

	return contexts;
}

async function eligibleTriggersForAction(
	ctx: QueryCtx,
	args: {
		owner: Id<'users'>;
		action: Doc<'actions'>;
	},
) {
	//
	const fileTriggers = await ctx.db
		.query('triggers')
		.withIndex('by_file', (q) => q.eq('file', args.action.file))
		.collect();
	const triggers = fileTriggers.filter(
		(trigger) => trigger.kind === 'file' && trigger.owner === args.owner && isTriggerEligible(trigger),
	);

	if (!args.action.loopKey) return triggers;

	const loop = await findLoopByKey(ctx, {
		owner: args.owner,
		key: args.action.loopKey,
	});
	if (!loop) return triggers;

	const loopTriggers = await ctx.db
		.query('triggers')
		.withIndex('by_loop', (q) => q.eq('loop', loop._id))
		.collect();
	const visibleLoopTriggers = [];

	for (const trigger of loopTriggers) {
		if (trigger.kind !== 'loop') continue;
		if (trigger.owner !== loop.owner) continue;
		if (!isTriggerEligible(trigger)) continue;
		visibleLoopTriggers.push(trigger);
	}

	return triggers.concat(visibleLoopTriggers);
}

async function triggerContext(
	ctx: QueryCtx,
	args: {
		owner: Id<'users'>;
		trigger: Doc<'triggers'>;
	},
) {
	//
	return {
		trigger: args.trigger._id,
		kind: args.trigger.kind,
		handler: args.trigger.handler,
		handlerCode: await catFile(ctx, {
			owner: args.trigger.owner,
			fileId: args.trigger.handler,
		}),
		maxUses: args.trigger.maxUses,
		uses: args.trigger.uses,
		file: args.trigger.kind === 'file' ? args.trigger.file : undefined,
		loop: args.trigger.kind === 'loop' ? args.trigger.loop : undefined,
	};
}

async function deriveTriggerTarget(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		source: z.infer<typeof proposalSourceSchema>;
	},
) {
	//
	if (args.source.kind === 'endpoint') {
		await ensureFileOwner(ctx, {
			owner: args.owner,
			fileId: args.source.file,
		});
		return {
			file: args.source.file,
			loop: undefined,
			loopOwner: undefined,
			intelligenceKey: undefined,
		};
	}

	const action = await ctx.db.get(args.source.actionId);
	if (!action || action.owner !== args.owner) throw NotFound();
	if (action.interruptedAt !== undefined || action.status !== 'succeeded') return undefined;

	const loop = action.loopKey
		? await findLoopByKey(ctx, {
				owner: args.owner,
				key: action.loopKey,
			})
		: undefined;

	return {
		file: action.file,
		loop: loop?._id,
		loopOwner: loop?.owner,
		intelligenceKey: action.intelligenceKey,
	};
}

function doesTriggerApplyToTarget(args: {
	trigger: Doc<'triggers'>;
	target: {
		file: Id<'files'>;
		loop?: Id<'loops'>;
		loopOwner?: Id<'users'>;
	};
}) {
	//
	if (args.trigger.kind === 'file') return args.trigger.file === args.target.file;

	return args.target.loop !== undefined && args.trigger.loop === args.target.loop;
}

function isTriggerVisibleForTarget(args: {
	trigger: Doc<'triggers'>;
	target: {
		loopOwner?: Id<'users'>;
	};
	owner: Id<'users'>;
}) {
	//
	if (args.trigger.kind === 'file') return args.trigger.owner === args.owner;

	return args.target.loopOwner !== undefined && args.trigger.owner === args.target.loopOwner;
}

function selectedLoop(args: {
	proposal: z.infer<typeof isolateProposalSchema>;
	trigger: Doc<'triggers'>;
	target: {
		loop?: Id<'loops'>;
	};
}) {
	//
	if (args.proposal.loop === null) return undefined;
	if (args.proposal.loop) return args.proposal.loop;
	if (args.trigger.kind === 'loop') return args.trigger.loop;

	return args.target.loop;
}

function actionArgsForProposal(args: { args: Record<string, unknown>; trigger: Id<'triggers'> }) {
	//
	return {
		...args.args,
		trigger: args.trigger,
	};
}
