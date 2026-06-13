import { useNavigate } from '@tanstack/react-router';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Doc, Id } from 'convex/_generated/dataModel';
import { useEffect, useState } from 'react';
import { ActionComposer } from './ActionComposer';
import { ActionLog } from './ActionLog';
import { BoxPanel } from './BoxPanel';
import { ChangesetReview } from './ChangesetReview';
import { Explorer } from './Explorer';
import { FilePanel } from './FilePanel';
import { TriggerPanel } from './TriggerPanel';
import { FileRenderer } from './renderers/FileRenderer';
import { shortId } from './utils';

interface Props {
	//
	mode?: 'reg' | 'dev';
	routePath?: string;
}

export function WorkspaceApp({ mode = 'reg', routePath = '/' }: Props) {
	//
	const navigate = useNavigate();
	const normalizedRoutePath = normalizeRoutePath(routePath);
	const rootState = useQuery(api.files.getRootDirectory, {});
	const ensureRoot = useMutation(api.files.ensureRootDirectory);
	const act = useAction(api.reactor.act);
	const routeConventionState = useQuery(
		api.files.getRouteConventionState,
		rootState?.root ? { directory: rootState.root._id } : 'skip',
	);
	const routePage = useQuery(
		api.files.getRoutePage,
		rootState?.root && mode === 'reg' ? { path: normalizedRoutePath } : 'skip',
	);
	const navigationContext = useQuery(
		api.files.getNavigationContext,
		rootState?.root && mode === 'dev' ? { path: normalizedRoutePath } : 'skip',
	);
	const isNavigationReady = mode !== 'dev' || navigationContext?.requestedPath === normalizedRoutePath;
	const routePageFile = mode === 'reg' ? routePage?.file : undefined;
	const devRouteFile =
		isNavigationReady && mode === 'dev' && navigationContext?.current?.kind === 'file'
			? navigationContext.current
			: undefined;
	const selectedRouteFile = routePageFile?.kind === 'file' ? routePageFile : devRouteFile;
	const routeFileContent = useQuery(
		api.files.getFileContent,
		mode === 'reg' && routePage !== undefined && routePage.content === undefined && selectedRouteFile
			? { file: selectedRouteFile._id }
			: 'skip',
	);
	const [selectedAction, setSelectedAction] = useState<Id<'actions'>>();
	const [notice, setNotice] = useState('');
	const [hasRequestedRouteSeed, setHasRequestedRouteSeed] = useState(false);

	useEffect(() => {
		if (rootState === null) void ensureRoot({});
	}, [ensureRoot, rootState]);

	useEffect(() => {
		if (mode !== 'dev') return;
		if (!isNavigationReady) return;
		if (!navigationContext) return;
		if (navigationContext.canonicalPath === normalizedRoutePath) return;

		if (navigationContext.canonicalPath === '/') {
			void navigate({ to: '/', search: { mode: 'dev' }, replace: true });
			return;
		}
		void navigate({
			to: '/$',
			params: { _splat: navigationContext.canonicalPath.slice(1) },
			search: { mode: 'dev' },
			replace: true,
		});
	}, [isNavigationReady, mode, navigate, navigationContext, normalizedRoutePath]);

	useEffect(() => {
		if (mode !== 'reg') return;
		if (!routePage?.canonicalPath) return;
		if (routePage.canonicalPath === normalizedRoutePath) return;

		if (routePage.canonicalPath === '/') {
			void navigate({ to: '/', search: {}, replace: true });
			return;
		}
		void navigate({
			to: '/$',
			params: { _splat: routePage.canonicalPath.slice(1) },
			search: {},
			replace: true,
		});
	}, [mode, navigate, normalizedRoutePath, routePage?.canonicalPath]);

	useEffect(() => {
		if (!rootState?.root) return;
		if (routeConventionState?.isSeeded !== false) return;
		if (hasRequestedRouteSeed) return;

		setHasRequestedRouteSeed(true);
		void act({
			directory: rootState.root._id,
			skillKey: 'seedRouteConventions',
			args: {},
		})
			.then(() => setNotice('Route conventions seeded.'))
			.catch((error: unknown) => {
				const message = error instanceof Error ? error.message : 'Could not seed route conventions.';
				setNotice(message);
			});
	}, [act, hasRequestedRouteSeed, rootState, routeConventionState]);

	let selectedRouteFolder = rootState?.root;
	if (isNavigationReady && mode === 'dev' && navigationContext?.directory) {
		selectedRouteFolder = navigationContext.directory;
	}
	const activeDirectory =
		(mode === 'reg' ? routePage?.directory : undefined) ??
		(isNavigationReady && mode === 'dev' ? navigationContext?.directory?._id : undefined) ??
		selectedRouteFile?.parent ??
		selectedRouteFolder?._id ??
		rootState?.root._id;

	if (rootState === undefined) {
		return <div className="p-6 text-sm text-muted-foreground">Loading PRO directory...</div>;
	}

	if (rootState === null || !activeDirectory) {
		return <div className="p-6 text-sm text-muted-foreground">Preparing PRO directory...</div>;
	}

	if (mode === 'dev' && (!isNavigationReady || navigationContext === undefined)) {
		return <div className="p-6 text-sm text-muted-foreground">Loading PRO directory...</div>;
	}

	if (mode === 'dev' && navigationContext && !navigationContext.current) {
		return <MissingRoutePath path={normalizedRoutePath} />;
	}

	if (mode === 'reg') {
		const shouldRenderRouteFile = routePage?.content === undefined && selectedRouteFile !== undefined;
		const isRouteFileLoading = shouldRenderRouteFile && routeFileContent === undefined;

		return (
			<RegRoutePage
				isLoading={routePage === undefined || isRouteFileLoading}
				file={selectedRouteFile ?? routePage?.file}
				content={routePage?.content ?? routeFileContent?.content}
			/>
		);
	}

	const handleCreateFolder = async () => {
		//
		await act({
			directory: activeDirectory,
			skillKey: 'create',
			args: { kind: 'folder', name: `folder-${Date.now().toString().slice(-4)}` },
		});
		setNotice('Folder created.');
	};

	const handleCreateFile = async () => {
		//
		await act({
			directory: activeDirectory,
			skillKey: 'create',
			args: { kind: 'file', name: `note-${Date.now().toString().slice(-4)}.txt`, content: 'New PRO file.\\n' },
		});
		setNotice('File created.');
	};

	return (
		<div className="h-full min-h-[calc(100svh-64px)] bg-background text-foreground">
			<div className="border-b border-border px-4 py-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div>
						<h1 className="text-lg font-semibold">PRO</h1>
						<p className="text-xs text-muted-foreground">
							Personal Relentless Operator - {mode.toUpperCase()} {normalizedRoutePath} - directory{' '}
							{shortId(activeDirectory)}
						</p>
					</div>
					{notice && <div className="rounded border border-border bg-muted px-3 py-1 text-xs">{notice}</div>}
				</div>
			</div>
			<div className="grid h-[calc(100svh-118px)] min-h-0 grid-cols-1 lg:grid-cols-[280px_minmax(420px,1fr)_440px]">
				<aside className="min-h-0 border-r border-border">
					<Explorer
						root={navigationContext?.root ?? rootState.root}
						selected={navigationContext?.current?._id ?? selectedRouteFolder?._id}
						childrenByParent={navigationContext?.childrenByParent}
						onCreateFile={handleCreateFile}
						onCreateFolder={handleCreateFolder}
					/>
				</aside>
				<main className="min-h-0 overflow-auto border-r border-border">
					<FilePanel
						selectedFile={selectedRouteFile}
						selectedFolder={selectedRouteFolder}
						activeDirectory={activeDirectory}
						onSaved={setNotice}
					/>
					<ActionComposer directory={activeDirectory} onDone={setNotice} />
					<TriggerPanel directory={activeDirectory} onDone={setNotice} />
				</main>
				<aside className="min-h-0 overflow-auto">
					<ActionLog
						directory={activeDirectory}
						selectedAction={selectedAction}
						onSelectAction={setSelectedAction}
					/>
					<ChangesetReview directory={activeDirectory} onDone={setNotice} />
					<BoxPanel directory={activeDirectory} />
				</aside>
			</div>
		</div>
	);
}

function RegRoutePage({
	isLoading,
	file,
	content,
}: {
	isLoading: boolean;
	file?: Doc<'files'> | null;
	content?: string;
}) {
	//
	return (
		<div className="h-full bg-background text-foreground">
			<FileRenderer file={file} content={content} isLoading={isLoading} />
		</div>
	);
}

function MissingRoutePath({ path }: { path: string }) {
	//
	return (
		<div className="h-full min-h-[calc(100svh-64px)] bg-background text-foreground">
			<div className="border-b border-border px-4 py-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div>
						<h1 className="text-lg font-semibold">PRO</h1>
						<p className="text-xs text-muted-foreground">Personal Relentless Operator - DEV {path}</p>
					</div>
				</div>
			</div>
			<main className="mx-auto max-w-4xl p-4">
				<div className="rounded border border-dashed border-border p-4 text-sm text-muted-foreground">
					No file or folder exists at <span className="font-mono text-foreground">{path}</span>.
				</div>
			</main>
		</div>
	);
}

function normalizeRoutePath(path: string) {
	//
	const parts = path
		.split('/')
		.map((part) => part.trim())
		.filter(Boolean);
	if (parts.length === 0) return '/';
	return `/${parts.join('/')}`;
}
