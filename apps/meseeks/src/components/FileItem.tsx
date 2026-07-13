import { Link } from '@tanstack/react-router';
import { Archive, Check, Dot, Loader2 } from 'lucide-react';
import { FileBudget } from '~/components/FileBudget';
import { FileStatusIndicator } from '~/components/FileStatusIndicator';
import { Button } from '@pro/ui/button';
import { TextShimmer } from '@pro/ui/text-shimmer';
import { useDiscard, useResolve } from '~/hooks/useFileMutations';
import { formatFileItemTimestamp, formatFileItemTimestampTooltip } from '~/lib/fileItemTimestamp';
import type { FileView } from '~/hooks/query/useFile';
import { cn } from '@pro/ui/lib/utils';

export function FileItem({
	file, //
	className,
}: {
	file: FileView;
	className?: string;
}) {
	//
	return (
		<div className={cn('group flex items-stretch justify-between min-w-0 pt-1', className)}>
			<Link
				to="/$"
				params={{ _splat: `tasks/${file._id}` }}
				resetScroll={false}
				className="flex items-center gap-1 align-middle min-w-0 flex-1"
			>
				<div className="flex w-4 shrink-0 justify-center self-stretch pt-1.5">
					<FileStatusIndicator file={file} />
				</div>
				<div className="min-w-0 flex-1 flex flex-col gap-0.5">
					<div className="flex items-center gap-2 min-w-0">
						<FileTitle file={file} />
					</div>
					<div className="flex items-center min-w-0">
						<FileItemTimestamp
							date={file._creationTime}
							className="text-sm text-muted-foreground truncate"
						/>
						{/* <Separator orientation="vertical" className="h-4 bg-primary" /> */}
						<Dot className="size-4" />
						<FileBudget
							file={file}
							precision={2}
							showColors={false}
							showTooltip={false}
							className="text-sm text-muted-foreground"
						/>
					</div>
				</div>
			</Link>
			{file.isActive && <FileItemActions file={file} />}
			{/* <Button
				variant="ghost"
				size="icon"
				className="justify-end [&_svg]:size-5 flex-shrink-0 hover:bg-transparent"
				onClick={(e) => {
					e.preventDefault();
					navigate({ to: '/$', params: { _splat: `tasks/${file._id}` } });
				}}
			>
				<ArrowRight />
			</Button> */}
		</div>
	);
}

function FileItemActions({ file }: { file: FileView }) {
	//
	const { resolve, isResolving } = useResolve();
	const { discard, isDiscarding } = useDiscard();

	const isBusy = isResolving || isDiscarding;

	const handleDiscard = () => {
		//
		if (isBusy) return;
		discard({ fileId: file._id });
	};

	const handleResolve = () => {
		//
		if (isBusy) return;
		resolve({ fileId: file._id });
	};

	return (
		<div className="flex shrink-0 items-center gap-1.5 py-2 pr-3 pl-1">
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="hidden size-8 rounded-xl text-muted-foreground hover:text-destructive group-hover:inline-flex group-focus-within:inline-flex"
				onClick={handleDiscard}
				disabled={isBusy}
				title="Discard"
				aria-label="Discard file"
			>
				{isDiscarding ? <Loader2 className="animate-spin" /> : <Archive />}
			</Button>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-8 rounded-xl"
				onClick={handleResolve}
				disabled={isBusy}
				title="Resolve"
				aria-label="Resolve file"
			>
				{isResolving ? <Loader2 className="animate-spin" /> : <Check />}
			</Button>
		</div>
	);
}

function FileItemTimestamp({
	date, //
	className,
}: {
	date: number | Date;
	className?: string;
}) {
	//
	const value = new Date(date);
	const fullTimestamp = formatFileItemTimestampTooltip(value);

	return (
		<>
			<time className={cn(className)} dateTime={fullTimestamp} title={fullTimestamp} aria-label={fullTimestamp}>
				{formatFileItemTimestamp(value)}
			</time>
		</>
	);
}

function FileTitle({ file }: { file: FileView }) {
	//
	const name = file.name || 'Untitled file';

	const classes = cn(
		'min-w-0 flex-1 text-base font-semibold leading-none tracking-tight break-words overflow-wrap-anywhere truncate',
		!file.isActive && 'line-through',
		!file.name && 'text-muted-foreground',
	);

	if (file.status === 'acting') {
		return <TextShimmer className={classes} text={name} />;
	}

	return <h3 className={classes}>{name}</h3>;
}
