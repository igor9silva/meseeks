import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

export async function findPageByRoute(
	ctx: QueryCtx | MutationCtx,
	args: {
		owner: Id<'users'> | 'isPro';
		root: Id<'files'>;
		route: string;
	},
) {
	//
	return await ctx.db
		.query('pages')
		.withIndex('by_owner_root_route', (q) =>
			q
				.eq('owner', args.owner) //
				.eq('root', args.root)
				.eq('route', normalizePageRoute(args.route)),
		)
		.first();
}

export async function listPagesForRoot(
	ctx: QueryCtx | MutationCtx,
	args: {
		owner: Id<'users'> | 'isPro';
		root: Id<'files'>;
	},
) {
	//
	const pages = await ctx.db
		.query('pages')
		.withIndex('by_owner_root_route', (q) =>
			q
				.eq('owner', args.owner) //
				.eq('root', args.root),
		)
		.collect();

	return pages.sort((left, right) => left.route.localeCompare(right.route));
}

export async function replaceCompiledPagesForRoot(
	ctx: MutationCtx,
	args: {
		owner: Id<'users'>;
		root: Id<'files'>;
		action: Id<'actions'>;
		pages: Array<{
			file: Id<'files'>;
			route: string;
			sourcePath: string;
			sourceHash?: string;
			diagnostics?: Array<string>;
		}>;
	},
) {
	//
	const existing = await listPagesForRoot(ctx, {
		owner: args.owner,
		root: args.root,
	});
	const existingByRoute = new Map(existing.map((page) => [page.route, page]));
	const nextRoutes = new Set(args.pages.map((page) => page.route));
	const compiledAt = Date.now();

	for (const page of args.pages) {
		const row = existingByRoute.get(page.route);
		const patch = {
			owner: args.owner,
			root: args.root,
			file: page.file,
			route: page.route,
			sourcePath: page.sourcePath,
			sourceHash: page.sourceHash,
			compiledBy: args.action,
			compiledAt,
			status: page.diagnostics?.length ? ('errored' as const) : ('enabled' as const),
			diagnostics: page.diagnostics,
		};

		if (row) {
			await ctx.db.patch(row._id, patch);
			continue;
		}

		await ctx.db.insert('pages', patch);
	}

	for (const page of existing) {
		if (nextRoutes.has(page.route)) continue;

		await ctx.db.patch(page._id, {
			status: 'disabled',
			compiledBy: args.action,
			compiledAt,
		});
	}
}

function normalizePageRoute(route: string) {
	//
	const trimmed = route.trim();
	if (!trimmed || trimmed === '/') return '/';

	return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}
