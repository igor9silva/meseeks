'use node';

import { getQuickJS, shouldInterruptAfterDeadline } from 'quickjs-emscripten';
import { z } from 'zod/v3';
import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import { actionProposalSchema } from 'schemas/workspaceSchema';
import type { SourceAuthor } from './causality.private';
import { recordWarning } from './ledger.private';
import {
	defaultMaxProposals,
	defaultTriggerTimeoutMs,
	errorMessage,
	hashText,
	maxTriggerDepth,
	triggerMemoryLimitBytes,
} from './utils.private';

type TriggerFile = {
	directory: Id<'files'>;
	file: {
		_id: Id<'files'>;
		path: string;
	};
	content?: string;
};

const triggerRuntimeSchema = z.object({
	config: z
		.object({
			maxUses: z.number().positive().optional(),
			timeoutMs: z.number().positive().optional(),
			maxProposals: z.number().nonnegative().optional(),
		})
		.default({}),
	proposals: z.array(actionProposalSchema),
});

const prepareTriggerSource = (source: string, contextJson: string) => {
	const rewritten = source
		.replace(/export\s+const\s+config\s*=/g, 'globalThis.config =')
		.replace(/export\s+default\s+function\s+trigger\s*\(/g, 'globalThis.trigger = function trigger(')
		.replace(/export\s+default\s+function\s*\(/g, 'globalThis.trigger = function(')
		.replace(/export\s+default\s*/g, 'globalThis.trigger = ');

	return `
globalThis.config = {};
${rewritten}
if (typeof globalThis.trigger !== "function") {
  throw new Error("Trigger file must export a default function.");
}
const __context = ${contextJson};
const __proposals = globalThis.trigger(__context) ?? [];
JSON.stringify({
  config: {
    maxUses: Number.isFinite(globalThis.config.maxUses) ? globalThis.config.maxUses : undefined,
    timeoutMs: Number.isFinite(globalThis.config.timeoutMs) ? globalThis.config.timeoutMs : undefined,
    maxProposals: Number.isFinite(globalThis.config.maxProposals) ? globalThis.config.maxProposals : undefined,
  },
  proposals: __proposals
});
`;
};

const evaluateTrigger = async ({
	source,
	context,
	timeoutMs,
	maxProposals,
}: {
	source: string;
	context: Record<string, unknown>;
	timeoutMs: number;
	maxProposals: number;
}) => {
	const quickjs = await getQuickJS();
	const runtime = quickjs.newRuntime();
	runtime.setMemoryLimit(triggerMemoryLimitBytes);
	runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + timeoutMs));
	const vm = runtime.newContext();
	const result = vm.evalCode(prepareTriggerSource(source, JSON.stringify(context)));

	if (result.error) {
		const dumped = vm.dump(result.error);
		result.error.dispose();
		vm.dispose();
		runtime.dispose();
		throw new Error(typeof dumped === 'string' ? dumped : 'Trigger evaluation failed');
	}

	const dumped = vm.dump(result.value);
	result.value.dispose();
	vm.dispose();
	runtime.dispose();
	const payload = triggerRuntimeSchema.parse(JSON.parse(String(dumped)));
	return {
		config: payload.config,
		proposals: payload.proposals.slice(0, maxProposals),
	};
};

const runTriggerFiles = async (
	ctx: ActionCtx,
	{
		owner,
		directory,
		sourceAction,
		sourceSkillKey,
		sourceAuthor,
		message,
		changedPaths,
		depth,
		triggers,
		event,
	}: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		sourceAction: Id<'actions'>;
		sourceSkillKey: string;
		sourceAuthor: SourceAuthor;
		message?: string;
		changedPaths?: string[];
		depth: number;
		triggers: TriggerFile[];
		event: 'action' | 'mutation';
	},
) => {
	if (depth >= maxTriggerDepth) {
		await recordWarning(ctx, {
			owner,
			directory,
			actionId: sourceAction,
			message: `Trigger depth ${depth} reached the MVP limit of ${maxTriggerDepth}.`,
		});
		return;
	}

	for (const trigger of triggers) {
		const source = trigger.content ?? '';
		const triggerHash = hashText(source);
		try {
			const triggerAuthorAction = await ctx.runQuery(internal.triggers._getTriggerFileAuthor, {
				owner,
				sourceFile: trigger.file._id,
			});
			if (!triggerAuthorAction) {
				throw new Error(`Trigger ${trigger.file.path} has no action-authored current revision.`);
			}
			const context = {
				event,
				action: {
					id: sourceAction,
					skillKey: sourceSkillKey,
					author: sourceAuthor,
					message,
				},
				directory: { id: directory },
				triggerDirectory: { id: trigger.directory },
				trigger: {
					sourceFile: trigger.file._id,
					path: trigger.file.path,
				},
				changedPaths: changedPaths ?? [],
			};
			const evaluated = await evaluateTrigger({
				source,
				context,
				timeoutMs: defaultTriggerTimeoutMs,
				maxProposals: defaultMaxProposals,
			});
			const timeoutMs = evaluated.config.timeoutMs ?? defaultTriggerTimeoutMs;
			const maxProposals = evaluated.config.maxProposals ?? defaultMaxProposals;
			const finalEvaluation =
				timeoutMs === defaultTriggerTimeoutMs && maxProposals === defaultMaxProposals
					? evaluated
					: await evaluateTrigger({
							source,
							context,
							timeoutMs,
							maxProposals,
						});

			const triggerId = await ctx.runMutation(internal.triggers._upsertTrigger, {
				owner,
				directory: trigger.directory,
				sourceFile: trigger.file._id,
				path: trigger.file.path,
				hash: triggerHash,
				status: 'indexed',
				author: {
					kind: 'action',
					action: triggerAuthorAction,
				},
				trigger: { kind: 'code' },
				config: finalEvaluation.config,
				didRun: true,
			});

			await ctx.runMutation(internal.actions._recordDetail, {
				detail: {
					action: sourceAction,
					owner,
					directory,
					kind: 'trigger',
					trigger: triggerId,
					sourceFile: trigger.file._id,
					proposals: finalEvaluation.proposals,
					createdAt: Date.now(),
				},
			});

			for (const proposal of finalEvaluation.proposals) {
				await ctx.runMutation(internal.actions._scheduleProposalAction, {
					owner,
					directory,
					sourceAction,
					trigger: triggerId,
					depth: depth + 1,
					proposal,
				});
			}
		} catch (error) {
			const messageText = errorMessage(error);
			const triggerAuthorAction = await ctx.runQuery(internal.triggers._getTriggerFileAuthor, {
				owner,
				sourceFile: trigger.file._id,
			});
			const triggerId = await ctx.runMutation(internal.triggers._upsertTrigger, {
				owner,
				directory: trigger.directory,
				sourceFile: trigger.file._id,
				path: trigger.file.path,
				hash: triggerHash,
				status: 'failed',
				author: triggerAuthorAction
					? {
							kind: 'action',
							action: triggerAuthorAction,
						}
					: sourceAuthor,
				trigger: { kind: 'code' },
				lastError: messageText,
				didRun: true,
			});
			await ctx.runMutation(internal.actions._recordDetail, {
				detail: {
					action: sourceAction,
					owner,
					directory,
					kind: 'trigger',
					trigger: triggerId,
					sourceFile: trigger.file._id,
					proposals: [],
					error: messageText,
					createdAt: Date.now(),
				},
			});
		}
	}
};

export const runActionTriggers = async (
	ctx: ActionCtx,
	args: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		sourceAction: Id<'actions'>;
		sourceSkillKey: string;
		sourceAuthor: SourceAuthor;
		message?: string;
		depth: number;
	},
) => {
	const triggers = await ctx.runQuery(internal.triggers._findActionTriggerFiles, {
		owner: args.owner,
		directory: args.directory,
	});
	await runTriggerFiles(ctx, {
		...args,
		triggers,
		event: 'action',
	});
};

export const runMutationTriggers = async (
	ctx: ActionCtx,
	args: {
		owner: Id<'users'>;
		directory: Id<'files'>;
		sourceAction: Id<'actions'>;
		sourceSkillKey: string;
		sourceAuthor: SourceAuthor;
		changedPaths: string[];
		depth: number;
	},
) => {
	if (args.changedPaths.length === 0) return;
	const triggers = await ctx.runQuery(internal.triggers._findMutationTriggerFiles, {
		owner: args.owner,
		directory: args.directory,
		changedPaths: args.changedPaths,
	});
	await runTriggerFiles(ctx, {
		...args,
		triggers,
		event: 'mutation',
	});
};
