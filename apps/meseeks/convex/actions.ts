import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import type { Id } from 'convex/_generated/dataModel';
import { mutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { intelligenceKeys } from 'schemas/intelligenceSchema';
import { skillKeySchema } from 'schemas/skillSchema';
import { getCurrentUser } from './users.private';
import { enqueueAction, findAction } from './actions.private';
import { ensureScopeOwner, ensureUserRootDirectory } from './files.private';
import { findActionIntelligence, resolveCallableSkill, validateSkillInput } from './reactor/claim.private';
import { claimNextAction } from './reactor.private';

export const act = mutation({
	args: {
		actions: z
			.array(
				z.object({
					root: zid('files').optional(),
					skill: skillKeySchema,
					intelligence: intelligenceKeys.optional(),
					input: z.record(z.unknown()).optional().default({}),
				}),
			)
			.min(1)
			.max(25),
	},
	handler: async (ctx, args) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const enqueued: Array<{
			root: Id<'files'>;
			skill: string;
			intelligence?: (typeof args)['actions'][number]['intelligence'];
			input: Record<string, unknown>;
		}> = [];

		for (const request of args.actions) {
			const requestedRoot = request.root ?? (await ensureUserRootDirectory(ctx, { owner: currentUser._id }));
			const root = (
				await ensureScopeOwner(ctx, {
					owner: currentUser._id,
					directory: requestedRoot,
				})
			)._id;

			const skill = await resolveCallableSkill(ctx, {
				owner: currentUser._id,
				root,
				key: request.skill,
			});
			const input = validateSkillInput(skill, request.input);
			const intelligence = findActionIntelligence(input, request.intelligence);

			enqueued.push({
				root,
				skill: request.skill,
				intelligence,
				input,
			});
		}

		const actions: Array<Id<'actions'>> = [];

		for (const action of enqueued) {
			actions.push(
				await enqueueAction(ctx, {
					owner: currentUser._id,
					root: action.root,
					author: currentUser._id,
					spark: 'self',
					skill: action.skill,
					intelligence: action.intelligence,
					input: action.input,
				}),
			);
		}

		const roots = new Set(enqueued.map((item) => item.root));
		for (const root of roots) {
			await claimNextAction(ctx, {
				owner: currentUser._id,
				root,
			});
		}

		return actions;
	},
});

export const find = query({
	args: {
		action: zid('actions'),
	},
	handler: async (ctx, args) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const action = await findAction(ctx, args);
		if (action.owner !== currentUser._id) throw NotFound();

		return action;
	},
});

export const listByRoot = query({
	args: {
		root: zid('files'),
		limit: z.number().int().min(1).max(100).optional().default(50),
	},
	handler: async (ctx, { root, limit }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const actionRoot = await ensureScopeOwner(ctx, {
			owner: currentUser._id,
			directory: root,
		});

		return await ctx.db
			.query('actions')
			.withIndex('by_root_index', (q) => q.eq('root', actionRoot._id))
			.order('desc')
			.take(limit);
	},
});
