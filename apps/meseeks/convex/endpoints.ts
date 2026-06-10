import { zid } from 'convex-helpers/server/zod3';
import { internalMutation, mutation, query } from 'lib/convex';
import { claimEndpoint, listEndpoints, receiveEndpointRequest, unclaimEndpoint } from './endpoints.private';
import { ensureFileOwner } from './files.private';
import { getCurrentUser } from './users.private';

export const claim = mutation({
	args: {
		file: zid('files'),
		handler: zid('files'),
	},
	handler: async (ctx, { file, handler }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		await ensureFileOwner(ctx, { fileId: file, owner: currentUser._id });
		await ensureFileOwner(ctx, { fileId: handler, owner: currentUser._id });

		return await claimEndpoint(ctx, {
			owner: currentUser._id,
			file,
			handler,
			author: currentUser._id,
		});
	},
});

export const unclaim = mutation({
	args: {
		endpointId: zid('endpoints'),
	},
	handler: async (ctx, { endpointId }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await unclaimEndpoint(ctx, {
			owner: currentUser._id,
			endpointId,
			author: currentUser._id,
		});
	},
});

export const list = query({
	args: {
		file: zid('files').optional(),
	},
	handler: async (ctx, { file }) => {
		//
		const currentUser = await getCurrentUser(ctx, {});
		return await listEndpoints(ctx, { owner: currentUser._id, file });
	},
});

// called by the Convex HTTP route after extracting the opaque slug and secret.
export const _receive = internalMutation({
	args: receiveEndpointRequest.args.shape,
	handler: receiveEndpointRequest,
});
