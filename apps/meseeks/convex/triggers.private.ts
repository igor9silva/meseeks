import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Doc, Id } from 'convex/_generated/dataModel';
import type { MutationCtx, QueryCtx } from 'convex/_generated/server';
import { defineQuery } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { newActionSchema } from 'schemas/actionSchema';
import { fileRevisionChangeKindSchema } from 'schemas/fileRevisionSchema';
import { enqueueAction } from './actions.private';
import { recordActionDetail } from './action/details.private';
import { ensureDirectoryOwner } from './files.private';

type MutationTrigger = Extract<Doc<'triggers'>, { kind: 'mutation' }>;

export const findTriggersByRoot = defineQuery({
	args: z.object({
		owner: zid('users'),
		root: zid('files'),
	}),
	handler: async (ctx, { owner, root }) => {
		//
		await ensureDirectoryOwner(ctx, {
			owner,
			directory: root,
		});

		return await ctx.db
			.query('triggers')
			.withIndex('by_owner_root', (q) =>
				q
					.eq('owner', owner) //
					.eq('root', root),
			)
			.collect();
	},
});

export async function replaceCompiledMutationTriggersForRoot(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		root: Id<'files'>;
		action: Id<'actions'>;
		triggers: Array<{
			events: Array<z.infer<typeof fileRevisionChangeKindSchema>>;
			pattern?: string;
			reactions: Array<z.infer<typeof newActionSchema>>;
			maxUses?: number;
			sourceFile: Id<'files'>;
			sourcePath: string;
			sourceHash?: string;
		}>;
	},
) {
	//
	await ensureDirectoryOwner(ctx, {
		owner: args.owner,
		directory: args.root,
	});

	const existing = await ctx.db
		.query('triggers')
		.withIndex('by_owner_root', (q) =>
			q
				.eq('owner', args.owner) //
				.eq('root', args.root),
		)
		.collect();
	const existingCompiled = existing.filter(
		(trigger) => trigger.sourcePath?.startsWith('/.pro/triggers/') || trigger.sourcePath?.startsWith('/triggers/'),
	);
	const existingByKey = new Map(existingCompiled.map((trigger) => [compiledTriggerKey(trigger), trigger]));
	const nextKeys = new Set(args.triggers.map((trigger) => compiledTriggerKey(trigger)));
	const compiledAt = Date.now();

	for (const trigger of args.triggers) {
		const row = existingByKey.get(compiledTriggerKey(trigger));
		let remainingUses = trigger.maxUses;
		if (row && row.sourceHash === trigger.sourceHash && row.maxUses === trigger.maxUses) {
			remainingUses = row.remainingUses;
		}
		const next = {
			owner: args.owner,
			root: args.root,
			author: args.action,
			kind: 'mutation' as const,
			status: 'enabled' as const,
			runCount: row?.runCount ?? 0,
			lastRunAt: row?.lastRunAt,
			lastError: undefined,
			events: trigger.events,
			pattern: trigger.pattern,
			reactions: trigger.reactions,
			maxUses: trigger.maxUses,
			remainingUses,
			sourceFile: trigger.sourceFile,
			sourcePath: trigger.sourcePath,
			sourceHash: trigger.sourceHash,
			compiledBy: args.action,
			compiledAt,
		};

		if (row) {
			await ctx.db.patch(row._id, next);
			continue;
		}

		// compile is the only trigger-row creation path; trigger source files are canonical.
		await ctx.db.insert('triggers', next);
	}

	for (const trigger of existingCompiled) {
		if (nextKeys.has(compiledTriggerKey(trigger))) continue;

		await ctx.db.delete(trigger._id);
	}
}

export async function disableTriggerForAction(
	ctx: MutationCtx,
	{ owner, trigger }: { owner: Id<'users'>; trigger: Id<'triggers'> },
) {
	//
	const row = await ctx.db.get(trigger);
	if (!row) throw NotFound();
	if (row.owner !== owner) throw NotFound();

	await ctx.db.patch(trigger, { status: 'disabled' });

	return trigger;
}

export async function scheduleMutationTriggerReactions(
	ctx: MutationCtx,
	{
		action,
		revisions,
	}: {
		action: Doc<'actions'>;
		revisions: Array<Doc<'file_revisions'>>;
	},
) {
	//
	if (action.author !== action.owner) return [];

	const visibleRevisions = revisions.filter(
		(revision) => !isActionOutputPath(revision.afterPath ?? revision.beforePath),
	);
	if (visibleRevisions.length === 0) return [];

	const triggers = await findEnabledMutationTriggersForTree(ctx, {
		owner: action.owner,
		root: action.root,
	});
	const spark = action.spark === 'self' ? action._id : action.spark;
	const roots = new Set<Id<'files'>>();

	for (const trigger of triggers) {
		const matched = visibleRevisions.filter((revision) => triggerMatchesRevision(trigger, revision));
		if (matched.length === 0) continue;

		const acceptedActions: Array<Id<'actions'>> = [];
		const matchedRevisions = matched.map((revision) => revision._id);
		const matchedPaths = matched.flatMap((revision) => {
			const path = revision.afterPath ?? revision.beforePath;
			if (!path) return [];

			return [path];
		});
		const source = triggerReceiptSource(trigger);
		for (const reaction of trigger.reactions) {
			const reactionAction = await enqueueAction(ctx, {
				owner: action.owner,
				root: trigger.root,
				author: action._id,
				spark,
				skill: reaction.skill,
				input: reaction.input,
			});
			acceptedActions.push(reactionAction);
			await recordActionDetail(ctx, {
				detail: {
					owner: action.owner,
					action: reactionAction,
					createdAt: Date.now(),
					kind: 'trigger',
					trigger: trigger._id,
					...source,
					sourceAction: action._id,
					matchedRevisions,
					matchedPaths,
					proposals: [reaction],
				},
			});
		}
		if (acceptedActions.length > 0) roots.add(trigger.root);

		const remainingUses = trigger.maxUses ? (trigger.remainingUses ?? trigger.maxUses) - 1 : undefined;

		await ctx.db.patch(trigger._id, {
			lastRunAt: Date.now(),
			runCount: (trigger.runCount ?? 0) + 1,
			lastError: undefined,
			remainingUses,
		});

		await recordActionDetail(ctx, {
			detail: {
				owner: action.owner,
				action: action._id,
				createdAt: Date.now(),
				kind: 'trigger',
				trigger: trigger._id,
				...source,
				matchedRevisions,
				matchedPaths,
				proposals: trigger.reactions,
				acceptedActions,
			},
		});
	}

	return Array.from(roots);
}

async function findEnabledMutationTriggersForTree(
	ctx: QueryCtx | MutationCtx,
	{ owner, root }: { owner: Id<'users'>; root: Id<'files'> },
) {
	//
	const roots = await listDirectoryAncestors(ctx, { owner, root });
	const triggers = [];
	for (const directory of roots) {
		triggers.push(
			...(await ctx.db
				.query('triggers')
				.withIndex('by_root_kind_status', (q) =>
					q
						.eq('root', directory) //
						.eq('kind', 'mutation')
						.eq('status', 'enabled'),
				)
				.collect()),
		);
	}

	return triggers.filter((trigger): trigger is MutationTrigger => {
		if (trigger.kind !== 'mutation') return false;
		if (trigger.remainingUses === 0) return false;

		return trigger.owner === owner;
	});
}

async function listDirectoryAncestors(
	ctx: QueryCtx | MutationCtx,
	{ owner, root }: { owner: Id<'users'>; root: Id<'files'> },
) {
	//
	const roots: Array<Id<'files'>> = [];
	let current: Doc<'files'> | null = await ctx.db.get(root);
	if (!current) throw NotFound();

	while (current) {
		if (current.owner !== owner) throw NotFound();
		if (current.kind !== 'directory') throw NotFound();
		roots.push(current._id);
		if (current.parent === 'root') break;
		current = await ctx.db.get(current.parent);
	}

	return roots;
}

function triggerMatchesRevision(trigger: Doc<'triggers'>, revision: Doc<'file_revisions'>) {
	//
	if (trigger.kind !== 'mutation') return false;
	if (!trigger.events.includes(revision.changeKind)) return false;

	const path = revision.afterPath ?? revision.beforePath ?? '';

	return matchesPattern(path, trigger.pattern);
}

function matchesPattern(path: string, pattern: string | undefined) {
	//
	const trimmed = pattern?.trim();
	if (!trimmed) return true;
	if (!trimmed.includes('*')) return path.includes(trimmed);

	const escaped = trimmed
		.split('*')
		.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
		.join('.*');
	const regex = new RegExp(`^${escaped}$`);

	return regex.test(path);
}

function compiledTriggerKey({ pattern, sourcePath }: { pattern?: string; sourcePath?: string }) {
	//
	return `${sourcePath ?? ''}\n${pattern ?? ''}`;
}

function triggerReceiptSource(trigger: MutationTrigger) {
	//
	return {
		...(trigger.sourceFile ? { sourceFile: trigger.sourceFile } : {}),
		...(trigger.sourcePath ? { sourcePath: trigger.sourcePath } : {}),
		...(trigger.sourceHash ? { sourceHash: trigger.sourceHash } : {}),
		...(trigger.compiledBy ? { compiledBy: trigger.compiledBy } : {}),
		...(trigger.compiledAt ? { compiledAt: trigger.compiledAt } : {}),
	};
}

function isActionOutputPath(path: string | undefined) {
	//
	return path === '/.pro/actions' || Boolean(path?.startsWith('/.pro/actions/'));
}
