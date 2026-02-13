import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod';
import { mutation, query } from 'lib/convex';
import { NotFound } from 'lib/errors';
import { findAction } from './action.private';
import { findComponent, findComponentBySlug, shareComponentPublicly } from './components.private';
import { ensureTaskOwner } from './tasks.private';
import { getCurrentUser } from './users.private';

export const findOneBySlug = query({
	args: {
		slug: z.string(),
	},
	handler: async (ctx, { slug }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		const page = await findComponentBySlug(ctx, { slug, userId: currentUser._id });

		if (page) return page;

		throw NotFound();
	},
});

export const shareRenderAction = mutation({
	args: {
		actionId: zid('actions'),
	},
	handler: async (ctx, { actionId }) => {
		//
		const action = await findAction(ctx, { actionId });
		const { currentUser } = await ensureTaskOwner(ctx, { taskId: action.taskId });

		const body = action.result?.text;
		const hasBody = typeof body === 'string' && body.length > 0;

		if (!hasBody) throw NotFound();
		if (action.skillKey !== 'render') throw NotFound();
		if (action.status !== 'succeeded') throw NotFound();

		return await shareComponentPublicly(ctx, {
			owner: currentUser._id,
			body,
		});
	},
});

export const findPublicById = query({
	args: {
		componentId: zid('components'),
	},
	handler: async (ctx, { componentId }) => {
		//
		const component = await findComponent(ctx, { componentId });

		if (!component.isPublic) throw NotFound();
		if (component.slug) throw NotFound();

		return {
			_id: component._id,
			body: component.body,
		};
	},
});
