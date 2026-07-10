import { useRef, type ReactNode } from 'react';
import type { Id } from 'convex/_generated/dataModel';
import { Loading } from '~/components/Loading';
import { FileItem } from '~/components/FileItem';
import { useInfiniteScroll } from '@reactor/ui/hooks/useInfiniteScroll';
import { usePaginatedConventionFiles, usePaginatedFiles } from '~/hooks/useSuspensePaginatedQuery';
import type { FileView } from '~/hooks/query/useFile';

const PAGE_SIZE = 50;
const THRESHOLD = 0.5;

// unified file list used by inbox and file workspace surfaces
export function FileList({
	parentFileId = 'inbox',
	currentFileId,
	filter = 'inbox',
	className,
}: {
	parentFileId?: Id<'files'> | 'inbox';
	currentFileId?: string;
	filter?: 'inbox' | 'tasks';
	className?: string;
}) {
	//
	if (filter === 'tasks') return <ConventionFileList currentFileId={currentFileId} className={className} />;

	const parentId = parentFileId === 'inbox' ? undefined : parentFileId;
	const query = usePaginatedFiles({
		parentId,
		initialNumItems: PAGE_SIZE,
	});

	return (
		<FileListContent
			files={query.files}
			loadMore={query.loadMore}
			hasMore={query.hasMore}
			isLoadingMore={query.isLoadingMore}
			isLoadingFirstPage={query.isLoadingFirstPage}
			currentFileId={currentFileId}
			className={className}
			emptyContent={
				<EmptyFileList title="No inbox files" description="New unclassified files will appear here." />
			}
		/>
	);
}

function ConventionFileList({ currentFileId, className }: { currentFileId?: string; className?: string }) {
	//
	const query = usePaginatedConventionFiles({
		convention: 'task',
		initialNumItems: PAGE_SIZE,
	});

	return (
		<FileListContent
			files={query.files}
			loadMore={query.loadMore}
			hasMore={query.hasMore}
			isLoadingMore={query.isLoadingMore}
			isLoadingFirstPage={query.isLoadingFirstPage}
			currentFileId={currentFileId}
			className={className}
			emptyContent={
				<EmptyFileList title="No task files" description="Task files tagged kind=task will appear here." />
			}
		/>
	);
}

function EmptyFileList({ title, description }: { title: string; description: string }) {
	//
	return (
		<div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 px-6 text-center">
			<p className="text-sm font-medium text-foreground">{title}</p>
			<p className="max-w-64 text-sm text-muted-foreground">{description}</p>
		</div>
	);
}

function FileListContent({
	files,
	loadMore,
	hasMore,
	isLoadingMore,
	isLoadingFirstPage,
	currentFileId,
	className,
	emptyContent,
}: {
	files: FileView[];
	loadMore: (numItems: number) => void;
	hasMore: boolean;
	isLoadingMore: boolean;
	isLoadingFirstPage: boolean;
	currentFileId?: string;
	className?: string;
	emptyContent?: ReactNode;
}) {
	//
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	useInfiniteScroll({
		loadMore: (numItems) => loadMore(numItems),
		hasMore,
		isLoading: isLoadingMore,
		scrollContainerRef,
		pageSize: PAGE_SIZE,
		threshold: THRESHOLD,
	});

	return (
		<div ref={scrollContainerRef} className={`overflow-auto h-full ${className || ''}`}>
			{/* Initial loading state */}
			{isLoadingFirstPage && <Loading className="mt-4" />}

			{/* Content */}
			{!isLoadingFirstPage && files.length === 0 && emptyContent}

			{!isLoadingFirstPage && files.length > 0 && (
				<>
					{files.map((file) => (
						<FileItem
							key={file._id}
							file={file}
							className={currentFileId === file._id ? 'bg-muted' : undefined}
						/>
					))}

					{/* Loading more indicator */}
					{isLoadingMore && (
						<div className="flex justify-center pt-4">
							<Loading className="mt-4" />
						</div>
					)}
				</>
			)}
		</div>
	);
}

export function Inbox() {
	//
	return <FileList />;
}
