import type { Doc, Id } from 'convex/_generated/dataModel';
import { performResultSchema } from 'schemas/reactorSchema';
import { defineMutation } from 'lib/convex';
import { recordActionDetail } from '../action/details.private';
import { enqueueAction, findAction } from '../actions.private';
import { scheduleMutationTriggerReactions } from '../triggers.private';
import { applyActionOutputFile, applyCompileMutation, applyFileMutation, applyTriggerMutation } from './apply.private';
import { claimNextAction } from './claim.private';

export const settleAction = defineMutation({
	args: performResultSchema,
	handler: async (ctx, args) => {
		//
		const action = await findAction(ctx, { action: args.action });
		if (action.status !== 'running') throw new Error('Action is not running.');

		const revisions: Array<Id<'file_revisions'>> = [];
		const revisionRows: Array<Doc<'file_revisions'>> = [];
		const triggers: Array<Id<'triggers'>> = [];
		const paths: Array<string> = [];

		for (const mutation of args.fileMutations ?? []) {
			const applied = await applyFileMutation(ctx, {
				owner: action.owner,
				action: action._id,
				mutation,
			});
			const appliedRevisions = applied.revisions ?? (applied.revision ? [applied.revision] : []);
			for (const revisionId of appliedRevisions) {
				revisions.push(revisionId);
				const revision = await ctx.db.get(revisionId);
				if (revision) revisionRows.push(revision);
			}
			if (applied.path) paths.push(applied.path);
		}

		for (const mutation of args.triggerMutations ?? []) {
			const trigger = await applyTriggerMutation(ctx, {
				owner: action.owner,
				root: action.root,
				action: action._id,
				mutation,
			});
			if (trigger) triggers.push(trigger);
		}

		const compileDiagnostics: Array<string> = [];
		for (const mutation of args.compileMutations ?? []) {
			compileDiagnostics.push(
				...(await applyCompileMutation(ctx, {
					owner: action.owner,
					root: action.root,
					action: action._id,
					mutation,
				})),
			);
		}

		const output = args.output
			? await applyActionOutputFile(ctx, {
					owner: action.owner,
					action: action._id,
					root: action.root,
					index: action.index,
					body: args.output,
				})
			: undefined;

		if (output) paths.push(output.path);

		const warnings = (args.warnings ?? []).concat(compileDiagnostics);

		if (revisions.length > 0 || paths.length > 0 || warnings.length > 0) {
			await recordActionDetail(ctx, {
				detail: {
					owner: action.owner,
					action: action._id,
					createdAt: Date.now(),
					kind: 'file',
					file: output?.file._id,
					revisions,
					paths,
					warnings,
				},
			});
		}

		for (const trigger of triggers) {
			await recordActionDetail(ctx, {
				detail: {
					owner: action.owner,
					action: action._id,
					createdAt: Date.now(),
					kind: 'trigger',
					trigger,
				},
			});
		}

		if (args.providerReceipt) {
			await recordActionDetail(ctx, {
				detail: {
					owner: action.owner,
					action: action._id,
					createdAt: Date.now(),
					kind: 'provider',
					...args.providerReceipt,
				},
			});
		}

		if (args.uploadTicket) {
			await recordActionDetail(ctx, {
				detail: {
					owner: action.owner,
					action: action._id,
					createdAt: Date.now(),
					kind: 'upload',
					...args.uploadTicket,
				},
			});
		}

		if (args.error) {
			await recordActionDetail(ctx, {
				detail: {
					owner: action.owner,
					action: action._id,
					createdAt: Date.now(),
					kind: 'error',
					message: args.error,
				},
			});
		}

		await ctx.db.patch(action._id, {
			status: args.status,
			output: output?.file._id,
			finishedAt: Date.now(),
			warnings,
		});

		if (args.status === 'succeeded') {
			const acceptedActions: Array<Id<'actions'>> = [];
			const spark = action.spark === 'self' ? action._id : action.spark;
			for (const reaction of args.reactions ?? []) {
				const acceptedAction = await enqueueAction(ctx, {
					owner: action.owner,
					root: action.root,
					author: action._id,
					spark,
					skill: reaction.skill,
					input: reaction.input,
				});
				acceptedActions.push(acceptedAction);
			}
			if (acceptedActions.length > 0) {
				await recordActionDetail(ctx, {
					detail: {
						owner: action.owner,
						action: action._id,
						createdAt: Date.now(),
						kind: 'reaction',
						proposals: args.reactions ?? [],
						acceptedActions,
					},
				});
			}

			const reactionRoots = await scheduleMutationTriggerReactions(ctx, {
				action,
				revisions: revisionRows,
			});
			for (const root of reactionRoots) {
				if (root === action.root) continue;

				await claimNextAction(ctx, {
					owner: action.owner,
					root,
				});
			}
		}

		await claimNextAction(ctx, {
			owner: action.owner,
			root: action.root,
		});
	},
});
