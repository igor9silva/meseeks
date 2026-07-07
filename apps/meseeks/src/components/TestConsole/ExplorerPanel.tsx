import { Link } from '@tanstack/react-router';
import type { Doc, Id } from 'convex/_generated/dataModel';
import { ChevronUp, FileText, Folder, Settings2 } from 'lucide-react';
import { Badge } from '@reactor/ui/badge';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardHeader } from '@reactor/ui/card';
import { cn } from '@reactor/ui/lib/utils';
import { CompiledStatePanel } from './CompiledStatePanel';
import { absolutePath, dirname, joinPath, sortEntries } from './path';

export function ExplorerPanel({
	currentDirectory,
	currentPath,
	entries,
	missingPath,
	root,
	scopeRoot,
	selectedFile,
}: {
	currentDirectory: Doc<'files'>;
	currentPath: string;
	entries: Array<Doc<'files'>>;
	missingPath?: string;
	root: Id<'files'>;
	scopeRoot: Id<'files'>;
	selectedFile?: Doc<'files'>;
}) {
	//
	const sorted = sortEntries(entries);
	const parentPath = dirname(currentPath);
	const canGoUp = currentDirectory._id !== root;

	return (
		<div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
			<Card className="flex min-h-0 min-w-0 flex-[3] flex-col overflow-hidden">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between gap-2">
						<div className="truncate font-mono text-xs text-muted-foreground">
							{absolutePath(currentPath)}
						</div>
						<Badge variant="outline" className="shrink-0">
							{sorted.length} files
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="flex min-h-0 flex-1 flex-col gap-3">
					{missingPath ? (
						<div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
							<div className="font-medium">Path not found</div>
							<div className="mt-1 font-mono">{absolutePath(missingPath)}</div>
						</div>
					) : null}

					{canGoUp ? (
						<Button asChild variant="outline" size="sm" className="justify-start">
							<Link to="/$" params={{ _splat: parentPath }}>
								<ChevronUp className="mr-2 size-4" />
								Up
							</Link>
						</Button>
					) : null}

					<div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-md border">
						{sorted.length === 0 ? (
							<div className="p-3 text-sm text-muted-foreground">Empty directory.</div>
						) : (
							sorted.map((entry) => (
								<ExplorerEntry
									key={entry._id}
									currentPath={currentPath}
									entry={entry}
									isSelected={entry._id === selectedFile?._id}
								/>
							))
						)}
					</div>
				</CardContent>
			</Card>
			<div className="min-h-0 min-w-0 flex-[2]">
				<CompiledStatePanel root={scopeRoot} />
			</div>
		</div>
	);
}

function ExplorerEntry({
	currentPath,
	entry,
	isSelected,
}: {
	currentPath: string;
	entry: Doc<'files'>;
	isSelected: boolean;
}) {
	//
	const path = joinPath(currentPath, entry.name);
	const isProDirectory = entry.kind === 'directory' && entry.name === '.pro';
	const Icon = iconForEntry(entry, isProDirectory);
	const targetPath = isSelected ? currentPath : path;
	const size = entry.kind === 'file' && entry.size !== undefined ? formatSize(entry.size) : '';

	return (
		<Link
			to="/$"
			params={{ _splat: targetPath }}
			className={cn(
				'group flex min-w-0 items-center gap-2 border-b p-2 text-left text-sm last:border-b-0 hover:bg-accent',
				isSelected && 'bg-accent text-accent-foreground',
				isProDirectory && 'bg-primary/5 text-primary hover:bg-primary/10',
			)}
			data-selected={isSelected ? true : undefined}
		>
			<Icon
				className={cn(
					'size-4 shrink-0 text-muted-foreground group-hover:text-foreground',
					isProDirectory && 'text-primary',
				)}
			/>
			<div className="min-w-0 flex-1">
				<div className="truncate font-medium">{entry.name}</div>
			</div>
			{size ? <div className="shrink-0 font-mono text-xs text-muted-foreground">{size}</div> : null}
		</Link>
	);
}

function iconForEntry(entry: Doc<'files'>, isProDirectory: boolean) {
	//
	if (isProDirectory) return Settings2;
	if (entry.kind === 'directory') return Folder;

	return FileText;
}

function formatSize(size: number) {
	//
	if (size < 1024) return `${size} B`;

	const units = ['KiB', 'MiB', 'GiB', 'TiB'];
	let value = size / 1024;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}

	const formatted = value >= 10 ? value.toFixed(0) : value.toFixed(1);

	return `${formatted} ${units[unitIndex]}`;
}
