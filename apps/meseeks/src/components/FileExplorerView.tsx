import { Button, cn } from '@reactor/ui';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Doc, Id } from 'convex/_generated/dataModel';
import { ArrowUp, Binary, ChevronRight, File, FileCode, Folder, Home, RefreshCw, Tag } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect } from 'react';
import { Section } from './Section';
import { formatTime, shortId } from './utils';

export function FileExplorerView({ path }: { path: string }) {
	//
	const rootState = useQuery(api.files.getRootDirectory, {});
	const ensureRoot = useMutation(api.files.ensureRootDirectory);
	const normalizedPath = normalizeExplorerPath(path);
	const root = rootState && rootState.root ? rootState.root : undefined;
	const navigationContext = useQuery(api.files.getNavigationContext, root ? { path: normalizedPath } : 'skip');

	useEffect(() => {
		if (rootState === null) void ensureRoot({});
	}, [ensureRoot, rootState]);

	if (rootState === undefined) {
		return <div className="p-6 text-sm text-muted-foreground">Loading file explorer...</div>;
	}

	if (rootState === null || !root) {
		return <div className="p-6 text-sm text-muted-foreground">Preparing file explorer...</div>;
	}

	if (navigationContext === undefined) {
		return <div className="p-6 text-sm text-muted-foreground">Resolving file path...</div>;
	}

	if (!navigationContext?.current) {
		return <MissingFilePath path={normalizedPath} />;
	}

	return (
		<ResolvedExplorer
			root={navigationContext.root}
			selectedFile={navigationContext.current}
			selectedFolder={navigationContext.directory}
			branch={navigationContext.branch}
			childrenByParent={navigationContext.childrenByParent}
		/>
	);
}

function ResolvedExplorer({
	root,
	selectedFile,
	selectedFolder,
	branch,
	childrenByParent,
}: {
	root: Doc<'files'>;
	selectedFile: Doc<'files'>;
	selectedFolder: Doc<'files'>;
	branch: Doc<'files'>[];
	childrenByParent: { parent: Id<'files'>; children: Doc<'files'>[] }[];
}) {
	//
	const children = new Map<Id<'files'>, Doc<'files'>[]>();
	for (const entry of childrenByParent) {
		children.set(entry.parent, entry.children);
	}
	const entries = children.get(selectedFolder._id);
	const parentFile = findParentInBranch(selectedFile, branch);

	return (
		<div className="flex h-full min-h-screen flex-col bg-background text-foreground">
			<header className="border-b border-border px-4 py-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div>
						<h1 className="text-lg font-semibold">Files</h1>
						<p className="text-xs text-muted-foreground">Raw PRO filesystem explorer</p>
					</div>
					<div className="flex items-center gap-1">
						<Button
							asChild
							size="sm"
							variant="outline"
							className="rounded"
							title="Open root"
							aria-label="Open root"
						>
							<Link to="/files">
								<Home className="size-4" />
							</Link>
						</Button>
						{parentFile ? (
							<ParentLink path={parentFile.path} />
						) : (
							<Button
								type="button"
								size="sm"
								variant="outline"
								className="rounded"
								title="Open parent"
								aria-label="Open parent"
								disabled
							>
								<ArrowUp className="size-4" />
							</Button>
						)}
					</div>
				</div>
				<BreadcrumbPath file={selectedFile} root={root} />
			</header>
			<div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-3">
				<aside className="min-h-0 border-r border-border">
					<FileTree root={root} selected={selectedFile._id} childrenByParent={children} />
				</aside>
				<main className="min-h-0 overflow-auto border-r border-border">
					<DirectoryPanel
						file={selectedFile}
						folder={selectedFolder}
						entries={entries}
						selected={selectedFile._id}
					/>
				</main>
				<aside className="min-h-0 overflow-auto">
					<RawFilePanel file={selectedFile} />
				</aside>
			</div>
		</div>
	);
}

function findParentInBranch(file: Doc<'files'>, branch: Doc<'files'>[]) {
	//
	if (!file.parent) return undefined;
	return branch.find((folder) => folder._id === file.parent);
}

function MissingFilePath({ path }: { path: string }) {
	//
	return (
		<div className="flex h-full min-h-screen flex-col bg-background text-foreground">
			<header className="border-b border-border px-4 py-3">
				<h1 className="text-lg font-semibold">Files</h1>
				<p className="text-xs text-muted-foreground">Raw PRO filesystem explorer</p>
			</header>
			<div className="flex flex-1 items-center justify-center p-6">
				<div className="max-w-md rounded border border-border p-4 text-center">
					<div className="font-mono text-sm">{path}</div>
					<p className="mt-2 text-sm text-muted-foreground">No file exists at this path.</p>
					<Button asChild variant="outline" className="mt-4 rounded">
						<Link to="/files">Open root</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}

function BreadcrumbPath({ file, root }: { file: Doc<'files'>; root: Doc<'files'> }) {
	//
	const parts = file.path === '/' ? [] : file.path.split('/').filter(Boolean);

	return (
		<nav className="mt-2 flex min-h-7 flex-wrap items-center gap-1 text-xs text-muted-foreground">
			<FilePathLink path="/" className="rounded px-1.5 py-1 font-medium text-foreground hover:bg-muted">
				{root.name}
			</FilePathLink>
			{parts.map((part, index) => {
				const nextPath = `/${parts.slice(0, index + 1).join('/')}`;
				return (
					<span key={`${part}-${index.toString()}`} className="flex items-center gap-1">
						<ChevronRight className="size-3" />
						<FilePathLink path={nextPath} className="rounded px-1.5 py-1 font-mono hover:bg-muted">
							{part}
						</FilePathLink>
					</span>
				);
			})}
		</nav>
	);
}

function FileTree({
	root,
	selected,
	childrenByParent,
}: {
	root: Doc<'files'>;
	selected: Id<'files'>;
	childrenByParent: Map<Id<'files'>, Doc<'files'>[]>;
}) {
	//
	return (
		<Section title="Tree" icon={<Folder className="size-3.5" />} className="h-full overflow-auto">
			<FileTreeNode file={root} depth={0} selected={selected} childrenByParent={childrenByParent} />
		</Section>
	);
}

function FileTreeNode({
	file,
	depth,
	selected,
	childrenByParent,
}: {
	file: Doc<'files'>;
	depth: number;
	selected: Id<'files'>;
	childrenByParent: Map<Id<'files'>, Doc<'files'>[]>;
}) {
	//
	const children = childrenByParent.get(file._id);
	const isSelected = selected === file._id;

	return (
		<div>
			<FilePathLink
				path={file.path}
				className={cn(
					'flex h-8 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-muted',
					isSelected && 'bg-muted text-foreground',
				)}
				style={{ paddingLeft: 8 + depth * 14 }}
			>
				<FileIcon file={file} />
				<span className="min-w-0 flex-1 truncate">{file.path === '/' ? 'Root' : file.name}</span>
				{file.kind === 'folder' && (
					<ChevronRight className={cn('size-3 text-muted-foreground', children && 'rotate-90')} />
				)}
			</FilePathLink>
			{children && (
				<div>
					{children.map((child) => (
						<FileTreeNode
							key={child._id}
							file={child}
							depth={depth + 1}
							selected={selected}
							childrenByParent={childrenByParent}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function DirectoryPanel({
	file,
	folder,
	entries,
	selected,
}: {
	file: Doc<'files'>;
	folder?: Doc<'files'>;
	entries?: Doc<'files'>[];
	selected: Id<'files'>;
}) {
	//
	const rows = entries ?? [];

	return (
		<Section title="Directory" icon={<Folder className="size-3.5" />} className="min-h-full">
			<div className="mb-3 rounded border border-border bg-muted/40 p-3">
				<div className="flex items-center gap-2">
					<FileIcon file={file} />
					<div className="min-w-0">
						<div className="truncate font-mono text-sm">{file.path}</div>
						<div className="text-xs text-muted-foreground">
							{file.kind} · {shortId(file._id)}
							{file.size !== undefined && ` · ${file.size} bytes`}
						</div>
					</div>
				</div>
			</div>
			{file.kind === 'file' && folder && (
				<div className="mb-3 rounded border border-dashed border-border p-3 text-xs text-muted-foreground">
					This file lives in <span className="font-mono text-foreground">{folder.path}</span>.
				</div>
			)}
			<div className="overflow-hidden rounded border border-border">
				<div className="flex gap-2 border-b border-border bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
					<span className="min-w-0 flex-1">Name</span>
					<span className="w-20 text-right">Kind</span>
					<span className="w-24 text-right">Updated</span>
				</div>
				{!folder && (
					<div className="px-3 py-6 text-center text-sm text-muted-foreground">
						Select a directory to browse children.
					</div>
				)}
				{folder && rows.length === 0 && (
					<div className="px-3 py-6 text-center text-sm text-muted-foreground">Empty directory.</div>
				)}
				{folder &&
					rows.map((child) => (
						<FilePathLink
							key={child._id}
							path={child.path}
							className={cn(
								'flex w-full items-center gap-2 border-b border-border/60 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted',
								child._id === selected && 'bg-muted',
							)}
						>
							<span className="flex min-w-0 flex-1 items-center gap-2">
								<FileIcon file={child} />
								<span className="truncate font-mono">{child.name}</span>
							</span>
							<span className="w-20 rounded bg-muted px-1.5 py-0.5 text-right text-xs text-muted-foreground">
								{child.kind}
							</span>
							<span className="w-24 text-right text-xs text-muted-foreground">
								{formatTime(child.updatedAt)}
							</span>
						</FilePathLink>
					))}
			</div>
		</Section>
	);
}

function ParentLink({ path }: { path: string }) {
	//
	if (path === '/') {
		return (
			<Button
				asChild
				size="sm"
				variant="outline"
				className="rounded"
				title="Open parent"
				aria-label="Open parent"
			>
				<Link to="/files">
					<ArrowUp className="size-4" />
				</Link>
			</Button>
		);
	}

	return (
		<Button asChild size="sm" variant="outline" className="rounded" title="Open parent" aria-label="Open parent">
			<Link to="/files/$" params={{ _splat: path.slice(1) }}>
				<ArrowUp className="size-4" />
			</Link>
		</Button>
	);
}

function FilePathLink({
	path,
	children,
	className,
	style,
}: {
	path: string;
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
}) {
	//
	if (path === '/') {
		return (
			<Link to="/files" className={className} style={style}>
				{children}
			</Link>
		);
	}

	return (
		<Link to="/files/$" params={{ _splat: path.slice(1) }} className={className} style={style}>
			{children}
		</Link>
	);
}

function RawFilePanel({ file }: { file: Doc<'files'> }) {
	//
	const content = useQuery(api.files.getFileContent, file.kind === 'file' ? { file: file._id } : 'skip');
	const revisions = useQuery(api.files.listRevisions, file.kind === 'file' ? { file: file._id } : 'skip');
	const tags = useQuery(api.files.listTags, { file: file._id });

	return (
		<Section title="Raw Source" icon={<FileCode className="size-3.5" />} className="min-h-full">
			<div className="mb-3 grid gap-2 text-xs sm:grid-cols-2">
				<Detail label="ID" value={shortId(file._id)} />
				<Detail label="Kind" value={file.kind} />
				<Detail label="Revision" value={file.currentRevision ? shortId(file.currentRevision) : 'none'} />
				<Detail label="Content Type" value={file.contentType ?? 'unknown'} />
				<Detail label="Hash" value={file.hash ?? 'none'} />
				<Detail label="Size" value={file.size === undefined ? 'unknown' : `${file.size.toString()} bytes`} />
			</div>
			<div className="mb-3">
				<div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
					<Tag className="size-3" />
					Tags
				</div>
				<div className="flex min-h-8 flex-wrap gap-1 rounded border border-border p-2">
					{tags === undefined && <span className="text-xs text-muted-foreground">Loading...</span>}
					{tags?.length === 0 && <span className="text-xs text-muted-foreground">No tags</span>}
					{tags?.map((tag) => (
						<span key={tag._id} className="rounded bg-muted px-2 py-1 font-mono text-xs">
							{tag.key}
							{tag.value && `=${tag.value}`}
						</span>
					))}
				</div>
			</div>
			{file.kind === 'folder' && (
				<div className="rounded border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
					<Folder className="mx-auto mb-2 size-5" />
					Directories do not have raw source in this view.
				</div>
			)}
			{file.kind === 'file' && (
				<div className="space-y-3">
					<div className="rounded border border-border">
						<div className="flex items-center justify-between border-b border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
							<span>Source</span>
							<span>{content?.content === undefined ? 'metadata only' : 'hot cached text'}</span>
						</div>
						<pre className="max-h-96 overflow-auto p-3 text-xs leading-relaxed">
							<code>{content?.content ?? 'No text cache is available for this file.'}</code>
						</pre>
					</div>
					<div>
						<div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
							<RefreshCw className="size-3" />
							Revisions
						</div>
						<div className="max-h-36 overflow-auto rounded border border-border">
							{revisions === undefined && (
								<div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>
							)}
							{revisions?.length === 0 && (
								<div className="px-3 py-2 text-xs text-muted-foreground">No revisions</div>
							)}
							{revisions?.map((revision) => (
								<div
									key={revision._id}
									className="flex gap-2 border-b border-border/60 px-3 py-2 text-xs last:border-b-0"
								>
									<span className="min-w-0 flex-1 truncate font-mono">{shortId(revision._id)}</span>
									<span className="text-right text-muted-foreground">
										{revision.size} bytes · {formatTime(revision.createdAt)}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</Section>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	//
	return (
		<div className="min-w-0 rounded border border-border p-2">
			<div className="text-muted-foreground">{label}</div>
			<div className="truncate font-mono text-foreground">{value}</div>
		</div>
	);
}

function FileIcon({ file }: { file: Doc<'files'> }) {
	//
	if (file.kind === 'folder') return <Folder className="size-4 text-sky-600" />;
	if (file.contentType && !file.contentType.startsWith('text/')) {
		return <Binary className="size-4 text-amber-600" />;
	}
	return <File className="size-4 text-zinc-500" />;
}

function normalizeExplorerPath(path: string) {
	//
	const parts = path.split('/').filter(Boolean);
	if (parts.length === 0) return '/';
	return `/${parts.join('/')}`;
}
