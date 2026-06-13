import { Button, cn } from '@reactor/ui';
import { Link } from '@tanstack/react-router';
import type { Doc, Id } from 'convex/_generated/dataModel';
import { ChevronRight, File, Folder, FolderPlus, Plus } from 'lucide-react';
import { Section } from './Section';

export type ExplorerChildren = {
	parent: Id<'files'>;
	children: Doc<'files'>[];
};

interface Props {
	//
	root: Doc<'files'>;
	selected?: Id<'files'>;
	childrenByParent?: ExplorerChildren[];
	onCreateFile: () => void;
	onCreateFolder: () => void;
}

export function Explorer({ root, selected, childrenByParent, onCreateFile, onCreateFolder }: Props) {
	//
	const children = new Map<Id<'files'>, Doc<'files'>[]>();
	for (const entry of childrenByParent ?? []) {
		children.set(entry.parent, entry.children);
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<Section title="Explorer" icon={<Folder className="size-3.5" />} className="flex-1 overflow-auto">
				<div className="mb-2 grid grid-cols-2 gap-1">
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="rounded"
						title="Create folder"
						aria-label="Create folder"
						onClick={onCreateFolder}
					>
						<FolderPlus className="size-4" />
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="rounded"
						title="Create file"
						aria-label="Create file"
						onClick={onCreateFile}
					>
						<Plus className="size-4" />
					</Button>
				</div>
				<FileTreeNode file={root} depth={0} selected={selected} childrenByParent={children} />
			</Section>
		</div>
	);
}

interface NodeProps {
	//
	file: Doc<'files'>;
	depth: number;
	selected?: Id<'files'>;
	childrenByParent: Map<Id<'files'>, Doc<'files'>[]>;
}

function FileTreeNode({ file, depth, selected, childrenByParent }: NodeProps) {
	//
	const children = childrenByParent.get(file._id);
	const isSelected = selected === file._id;

	return (
		<div>
			<FileTreeLink file={file} depth={depth} isSelected={isSelected} isExpanded={children !== undefined} />
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

interface LinkProps {
	//
	file: Doc<'files'>;
	depth: number;
	isSelected: boolean;
	isExpanded: boolean;
}

function FileTreeLink({ file, depth, isSelected, isExpanded }: LinkProps) {
	//
	const className = cn(
		'flex h-8 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-muted',
		isSelected && 'bg-muted text-foreground',
	);
	const style = { paddingLeft: 8 + depth * 14 };
	const content = (
		<>
			{file.kind === 'folder' ? (
				<Folder className="size-4 text-sky-600" />
			) : (
				<File className="size-4 text-zinc-500" />
			)}
			<span className="min-w-0 flex-1 truncate">{file.path === '/' ? 'Root' : file.name}</span>
			{file.kind === 'folder' && (
				<ChevronRight className={cn('size-3 text-muted-foreground', isExpanded && 'rotate-90')} />
			)}
		</>
	);

	if (file.path === '/') {
		return (
			<Link to="/" search={{ mode: 'dev' }} className={className} style={style}>
				{content}
			</Link>
		);
	}

	return (
		<Link
			to="/$"
			params={{ _splat: file.path.slice(1) }}
			search={{ mode: 'dev' }}
			className={className}
			style={style}
		>
			{content}
		</Link>
	);
}
