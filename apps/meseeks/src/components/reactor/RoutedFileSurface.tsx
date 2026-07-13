import { convexQuery } from '@convex-dev/react-query';
import { Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import type { Doc, Id } from 'convex/_generated/dataModel';
import { FileText } from 'lucide-react';
import { z } from 'zod/v3';
import { Badge } from '@pro/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@pro/ui/card';
import { FileList } from '~/components/Inbox';
import { QuickSeek } from '~/components/QuickSeek';
import { FileWorkspace } from '~/components/layout/FileWorkspace';
import { CurrentFileIdProvider } from '~/hooks/useCurrentFile';

const routeComponentSchema = z.discriminatedUnion('primitive', [
	z.object({
		primitive: z.literal('quick-create'),
	}),
	z.object({
		primitive: z.literal('file-workspace'),
		list: z.enum(['inbox', 'tasks']).default('tasks'),
	}),
	z.object({
		primitive: z.literal('file-list'),
		filter: z.enum(['inbox', 'tasks']),
	}),
	z.object({
		primitive: z.literal('tag-list'),
		title: z.string().min(1),
		tag: z.object({
			key: z.string().min(1),
			value: z.string(),
		}),
		itemRoute: z.string().min(1),
		emptyPrimitive: z.literal('quick-create').optional(),
	}),
]);

type RouteComponent = z.infer<typeof routeComponentSchema>;

export function RoutedFileSurface({ slug, fileId }: { slug: string; fileId?: Id<'files'> }) {
	//
	const routeSlug = normalizeRouteSlug({ slug, hasFileId: Boolean(fileId) });
	const routeQuery = convexQuery(api.routes.findBySlug, { slug: routeSlug });
	const { data: route } = useSuspenseQuery(routeQuery);

	if (route?.file) {
		return <SeededRouteComponent componentId={route.file} fileId={fileId ?? route.defaultFile} slug={routeSlug} />;
	}

	return <RouteConfigurationError slug={routeSlug} message="No route component is configured." />;
}

function SeededRouteComponent({
	componentId,
	fileId,
	slug,
}: {
	componentId: Id<'files'>;
	fileId?: Id<'files'>;
	slug: string;
}) {
	//
	const contentQuery = convexQuery(api.files.cat, { fileId: componentId });
	const { data: content } = useSuspenseQuery(contentQuery);
	const component = parseRouteComponent(content);
	if (!component) return <RouteConfigurationError slug={slug} message="Route component file is invalid." />;

	return <RoutePrimitive component={component} fileId={fileId} />;
}

function RoutePrimitive({ component, fileId }: { component: RouteComponent; fileId?: Id<'files'> }) {
	//
	if (component.primitive === 'quick-create') return <QuickCreateRoute />;
	if (component.primitive === 'file-workspace') {
		return <FileWorkspaceRoute component={component} fileId={fileId} />;
	}
	if (component.primitive === 'file-list') return <FileListRoute filter={component.filter} />;

	return <TagListRoute component={component} />;
}

function QuickCreateRoute() {
	//
	return (
		<div className="h-full overflow-auto">
			<QuickSeek />
		</div>
	);
}

function FileWorkspaceRoute({
	component,
	fileId,
}: {
	component: Extract<RouteComponent, { primitive: 'file-workspace' }>;
	fileId?: Id<'files'>;
}) {
	//
	if (!fileId) return <RouteConfigurationError slug="/tasks/:id" message="No file id is available." />;

	return (
		<CurrentFileIdProvider fileId={fileId}>
			<FileWorkspace list={component.list} />
		</CurrentFileIdProvider>
	);
}

function FileListRoute({ filter }: { filter: 'inbox' | 'tasks' }) {
	//
	return (
		<div className="h-full overflow-hidden">
			<FileList filter={filter} className="p-2" />
		</div>
	);
}

function RouteConfigurationError({
	slug,
	title = 'Route is not configured',
	message,
}: {
	slug: string;
	title?: string;
	message: string;
}) {
	//
	return (
		<div className="flex h-full items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-base">{title}</CardTitle>
					<CardDescription className="font-mono">{slug}</CardDescription>
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground">{message}</CardContent>
			</Card>
		</div>
	);
}

function TagListRoute({ component }: { component: Extract<RouteComponent, { primitive: 'tag-list' }> }) {
	//
	const filesQuery = convexQuery(api.files.queryByTag, {
		key: component.tag.key,
		value: component.tag.value,
	});
	const { data: files } = useSuspenseQuery(filesQuery);

	if (files.length === 0 && component.emptyPrimitive === 'quick-create') return <QuickCreateRoute />;

	return (
		<div className="h-full overflow-auto p-4">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
				<header className="flex items-center justify-between gap-3">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">{component.title}</h1>
						<p className="text-sm text-muted-foreground">
							{component.tag.key}={component.tag.value}
						</p>
					</div>
					<Badge variant="secondary">{files.length}</Badge>
				</header>
				<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
					{files.map((file) => (
						<FileCard key={file._id} file={file} itemRoute={component.itemRoute} />
					))}
					{files.length === 0 && (
						<Card>
							<CardContent className="p-4 text-sm text-muted-foreground">No files found.</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}

function FileCard({ file, itemRoute }: { file: Doc<'files'>; itemRoute: string }) {
	//
	const splat = `${itemRoute.replace(/^\//, '')}/${file._id}`;

	return (
		<Link to="/$" params={{ _splat: splat }} className="block h-full">
			<Card className="h-full transition-colors hover:bg-accent/40">
				<CardHeader>
					<div className="flex items-start gap-2">
						<FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
						<div className="min-w-0 flex-1">
							<CardTitle className="line-clamp-2 text-base">{file.name}</CardTitle>
						</div>
					</div>
				</CardHeader>
			</Card>
		</Link>
	);
}

function parseRouteComponent(content: string) {
	//
	try {
		return routeComponentSchema.parse(JSON.parse(content));
	} catch {
		return undefined;
	}
}

function normalizeRouteSlug({ slug, hasFileId }: { slug: string; hasFileId: boolean }) {
	//
	const cleanSlug = slug.startsWith('/') ? slug : `/${slug}`;
	if (hasFileId) return `${cleanSlug}/:id`;

	return cleanSlug;
}
