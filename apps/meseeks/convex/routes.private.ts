import { zid } from 'convex-helpers/server/zod3';
import { z } from 'zod/v3';
import { defineMutation, defineQuery } from 'lib/convex';
import { isError, NOT_FOUND_ERROR } from 'lib/errors';
import { managedComponents, managedRoutes } from 'lib/proDefinitions';
import { authorSchema } from 'schemas/authorSchema';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import {
	catFile,
	createFile,
	ensureFileOwner,
	ensureFileVisible,
	findChildByName,
	writeFileContent,
} from './files.private';
import { configuredProOwner } from './proOwner.private';
import { recordMutationAction } from './reactor.private';

const obsoleteManagedRouteSlugs = ['/list'];

export const upsertRoute = defineMutation({
	args: z.object({
		owner: zid('users'),
		slug: z.string().min(1),
		file: zid('files'),
		defaultFile: zid('files').optional(),
		isPublic: z.boolean().optional(),
		sourceOwner: zid('users').optional(),
		sourceKey: z.string().min(1).optional(),
		sourceFile: zid('files').optional(),
		author: authorSchema,
	}),
	handler: async (ctx, { owner, slug, file, defaultFile, isPublic, sourceOwner, sourceKey, sourceFile, author }) => {
		//
		await ensureFileVisible(ctx, {
			fileId: file,
			viewer: owner,
		});
		if (defaultFile) {
			await ensureFileOwner(ctx, {
				fileId: defaultFile,
				owner,
			});
		}

		const existing = await ctx.db
			.query('routes')
			.withIndex('by_owner_slug', (q) => q.eq('owner', owner).eq('slug', slug))
			.unique();
		const now = Date.now();

		if (existing) {
			if (
				existing.file === file &&
				existing.defaultFile === defaultFile &&
				existing.isPublic === isPublic &&
				existing.sourceOwner === sourceOwner &&
				existing.sourceKey === sourceKey &&
				existing.sourceFile === sourceFile
			) {
				return existing._id;
			}

			await ctx.db.patch(existing._id, {
				file,
				defaultFile,
				isPublic,
				sourceOwner,
				sourceKey,
				sourceFile,
				author,
				updatedAt: now,
			});

			await recordMutationAction(ctx, {
				owner,
				file: defaultFile ?? file,
				author,
				skillKey: 'updateRoute',
				args: {
					slug,
					file,
					defaultFile,
				},
				patch: `~ route ${slug} -> ${file}`,
			});

			return existing._id;
		}

		const routeId = await ctx.db.insert('routes', {
			owner,
			slug,
			file,
			defaultFile,
			isPublic,
			sourceOwner,
			sourceKey,
			sourceFile,
			author,
			createdAt: now,
			updatedAt: now,
		});

		await recordMutationAction(ctx, {
			owner,
			file: defaultFile ?? file,
			author,
			skillKey: 'createRoute',
			args: {
				slug,
				file,
				defaultFile,
			},
			patch: `+ route ${slug} -> ${file}`,
		});

		return routeId;
	},
});

export const findRouteBySlug = defineQuery({
	args: z.object({
		owner: zid('users'),
		slug: z.string().min(1),
	}),
	handler: async (ctx, { owner, slug }) => {
		//
		const owned = await ctx.db
			.query('routes')
			.withIndex('by_owner_slug', (q) => q.eq('owner', owner).eq('slug', slug))
			.unique();
		const visibleOwned = await visibleRoute(ctx, { owner, route: owned });
		if (visibleOwned) return visibleOwned;

		return await visibleRoute(ctx, {
			owner,
			route: await publicProRouteBySlug(ctx, { owner, slug }),
		});
	},
});

export const seedManagedRoutes = defineMutation({
	args: z.object({
		owner: zid('users'),
		author: authorSchema,
		defaultFile: zid('files').optional(),
	}),
	handler: async (ctx, { owner, author, defaultFile }) => {
		//
		const routeIds = [];
		const proOwner = configuredProOwner();
		const shouldManageSharedComponents = !defaultFile || owner === proOwner;
		const shouldWriteComponentFiles = shouldManageSharedComponents || !proOwner;

		for (const route of managedRoutes) {
			const componentSeed = managedComponents.find((component) => component.key === route.componentKey);
			if (!componentSeed) continue;

			const component = shouldWriteComponentFiles
				? await upsertManagedComponentFile(ctx, {
						owner,
						author,
						seed: componentSeed,
						isPublic: shouldManageSharedComponents,
					})
				: await publicProRouteComponent(ctx, {
						owner,
						slug: route.slug,
					});
			if (!component) continue;

			const routeId = await upsertRoute(ctx, {
				owner,
				slug: route.slug,
				file: component,
				defaultFile,
				isPublic: shouldManageSharedComponents ? true : undefined,
				sourceOwner: !shouldManageSharedComponents && proOwner ? proOwner : undefined,
				sourceKey: !shouldManageSharedComponents && proOwner ? route.slug : undefined,
				sourceFile: !shouldManageSharedComponents && proOwner ? component : undefined,
				author,
			});

			routeIds.push(routeId);
		}

		await deleteObsoleteManagedRoutes(ctx, { owner, author });

		return routeIds;
	},
});

async function deleteObsoleteManagedRoutes(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		author: z.infer<typeof authorSchema>;
	},
) {
	//
	for (const slug of obsoleteManagedRouteSlugs) {
		const existing = await ctx.db
			.query('routes')
			.withIndex('by_owner_slug', (q) => q.eq('owner', args.owner).eq('slug', slug))
			.unique();
		if (!existing) continue;

		await ctx.db.delete(existing._id);
		await recordMutationAction(ctx, {
			owner: args.owner,
			file: existing.defaultFile ?? existing.file,
			author: args.author,
			skillKey: 'deleteRoute',
			args: {
				slug,
			},
			patch: `- route ${slug}`,
		});
	}
}

async function upsertManagedComponentFile(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		author: z.infer<typeof authorSchema>;
		seed: (typeof managedComponents)[number];
		isPublic: boolean;
	},
) {
	//
	const existingComponent = await findChildByName(ctx, {
		owner: args.owner,
		name: args.seed.name,
	});
	const component = existingComponent
		? existingComponent._id
		: await createFile(ctx, {
				owner: args.owner,
				name: args.seed.name,
				author: args.author,
				content: args.seed.body,
				isPublic: args.isPublic,
				tags: [
					{ key: 'kind', value: 'component' },
					{ key: 'key', value: args.seed.key },
				],
				shouldAddInboxTag: false,
			});

	if (!existingComponent) return component;

	if (existingComponent.isPublic !== args.isPublic) {
		await ctx.db.patch(existingComponent._id, {
			isPublic: args.isPublic,
			updatedAt: Date.now(),
		});
	}
	const current = await catFile(ctx, { owner: args.owner, fileId: component });
	if (current !== args.seed.body) {
		await writeFileContent(ctx, {
			owner: args.owner,
			fileId: component,
			author: args.author,
			content: args.seed.body,
		});
	}

	return component;
}

async function publicProRouteComponent(ctx: QueryCtx, args: { owner: Id<'users'>; slug: string }) {
	//
	const route = await publicProRouteBySlug(ctx, args);
	return route?.file;
}

async function visibleRoute(
	ctx: QueryCtx,
	args: {
		owner: Id<'users'>;
		route?: Doc<'routes'> | null;
	},
) {
	//
	if (!args.route) return undefined;

	try {
		await ensureFileVisible(ctx, {
			fileId: args.route.file,
			viewer: args.owner,
		});
		return args.route;
	} catch (error: unknown) {
		// route rows can outlive disposable preview files after schema resets; treat that as unconfigured.
		if (isError(NOT_FOUND_ERROR, error)) return undefined;

		throw error;
	}
}

async function publicProRouteBySlug(ctx: QueryCtx, args: { owner: Id<'users'>; slug: string }) {
	//
	const routes = await ctx.db
		.query('routes')
		.withIndex('by_public_slug', (q) => q.eq('isPublic', true).eq('slug', args.slug))
		.collect();
	const sorted = routes
		.slice()
		.sort((left, right) => right.updatedAt - left.updatedAt || right._creationTime - left._creationTime);

	return sorted.find((route) => route.owner !== args.owner);
}
