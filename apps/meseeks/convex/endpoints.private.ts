import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import { endpointPathPrefix } from 'lib/endpoints';
import { NotFound } from 'lib/errors';
import { authorSchema } from 'schemas/authorSchema';
import { recordMutationAction } from './reactor.private';
import { createFileTrigger, removeTrigger } from './triggers.private';

const inboundRequestSchema = z.object({
	method: z.string().min(1),
	path: z.string().min(1),
	headers: z.record(z.string()),
	query: z.record(z.string()),
	body: z.string(),
});

export const claimEndpoint = defineMutation({
	args: z.object({
		owner: zid('users'),
		file: zid('files'),
		handler: zid('files'),
		author: authorSchema,
	}),
	handler: async (ctx, { owner, file, author, handler }) => {
		//
		const now = Date.now();
		const slug = crypto.randomUUID().replaceAll('-', '');
		const secret = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
		const slugHash = await hashOpaqueValue(slug);
		const secretHash = await hashOpaqueValue(secret);

		const endpointId = await ctx.db.insert('endpoints', {
			owner,
			file,
			slugHash,
			secretHash,
			isActive: true,
			author,
			createdAt: now,
			updatedAt: now,
		});

		const triggerId = await createFileTrigger(ctx, {
			owner,
			file,
			handler,
			author,
			auditFile: file,
		});

		await ctx.db.patch(endpointId, {
			trigger: triggerId,
			updatedAt: Date.now(),
		});

		const actionId = await recordMutationAction(ctx, {
			owner,
			file,
			author,
			skillKey: 'claimEndpoint',
			args: {
				endpoint: endpointId,
				trigger: triggerId,
			},
			patch: `+ endpoint ${endpointPathPrefix}${slug}`,
		});

		return {
			actionId,
			endpointId,
			slug,
			secret,
			path: `${endpointPathPrefix}${slug}`,
		};
	},
});

export const unclaimEndpoint = defineMutation({
	args: z.object({
		owner: zid('users'),
		endpointId: zid('endpoints'),
		author: authorSchema,
	}),
	handler: async (ctx, { owner, endpointId, author }) => {
		//
		const endpoint = await ctx.db.get(endpointId);
		if (!endpoint || endpoint.owner !== owner) throw NotFound();

		await ctx.db.patch(endpointId, {
			isActive: false,
			updatedAt: Date.now(),
		});

		if (endpoint.trigger) {
			await removeTrigger(ctx, {
				owner,
				triggerId: endpoint.trigger,
				author,
				auditFile: endpoint.file,
			});
		}

		return await recordMutationAction(ctx, {
			owner,
			file: endpoint.file,
			author,
			skillKey: 'unclaimEndpoint',
			args: {
				endpoint: endpointId,
			},
			patch: `- endpoint ${endpointId}`,
		});
	},
});

export const listEndpoints = defineQuery({
	args: z.object({
		owner: zid('users'),
		file: zid('files').optional(),
	}),
	handler: async (ctx, { owner, file }) => {
		//
		if (file) {
			return await ctx.db
				.query('endpoints')
				.withIndex('by_owner_file', (q) => q.eq('owner', owner).eq('file', file))
				.collect();
		}

		return await ctx.db
			.query('endpoints')
			.withIndex('by_owner_file', (q) => q.eq('owner', owner))
			.collect();
	},
});

export const receiveEndpointRequest = defineMutation({
	args: z.object({
		slug: z.string().min(1),
		secret: z.string().min(1),
		request: inboundRequestSchema,
	}),
	handler: async (ctx, { slug, secret, request }) => {
		//
		const slugHash = await hashOpaqueValue(slug);
		const endpoint = await ctx.db
			.query('endpoints')
			.withIndex('by_slugHash', (q) => q.eq('slugHash', slugHash))
			.unique();

		if (!endpoint || !endpoint.isActive) return undefined;

		const secretHash = await hashOpaqueValue(secret);
		if (secretHash !== endpoint.secretHash) return undefined;
		if (!endpoint.trigger) return undefined;

		const trigger = await ctx.db.get(endpoint.trigger);
		if (!trigger || trigger.owner !== endpoint.owner || trigger.uses >= trigger.maxUses) return undefined;
		if (trigger.kind === 'file' && trigger.file !== endpoint.file) return undefined;

		return {
			owner: endpoint.owner,
			file: endpoint.file,
			triggerId: endpoint.trigger,
			request,
		};
	},
});

async function hashOpaqueValue(value: string) {
	//
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}
