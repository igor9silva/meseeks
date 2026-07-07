import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { Doc, Id } from 'convex/_generated/dataModel';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Download, FileText, Move, RotateCcw, Save, Tag } from 'lucide-react';
import { Badge } from '@reactor/ui/badge';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@reactor/ui/card';
import { Input } from '@reactor/ui/input';
import { Label } from '@reactor/ui/label';
import { Separator } from '@reactor/ui/separator';
import { Textarea } from '@reactor/ui/textarea';
import { useAct } from '~/hooks/useAct';
import { ActionReference, FileReference } from './References';
import { absolutePath, dirname, joinPath } from './path';
import { contentFromPatch, contentTypeFromPatch } from './revisions';
import { Field, Result, formatError, formatJson } from './shared';

const maxEditableBytes = 512 * 1024;

export function FileWorkbench({
	actions,
	file,
	onSelectAction,
	path,
	root,
}: {
	actions: Array<Doc<'actions'>>;
	file: Doc<'files'>;
	onSelectAction: (actionId: string) => void;
	path: string;
	root: Id<'files'>;
}) {
	//
	const revisionsQuery = convexQuery(api.files.listRevisions, { file: file._id });
	const { data: revisions } = useSuspenseQuery(revisionsQuery);
	const latestRevision = revisions.find((revision) => revision._id === file.currentRevision) ?? revisions[0];
	const revisionContent = contentFromPatch(latestRevision?.patch);
	const revisionContentType = contentTypeFromPatch(latestRevision?.patch);
	const initialContent = revisionContent ?? '';
	const initialContentType = revisionContentType ?? file.contentType ?? 'text/plain; charset=utf-8';
	const canEdit = isEditableTextFile({
		content: revisionContent,
		contentType: initialContentType,
		size: file.size,
	});

	return (
		<div className="grid min-w-0 gap-3">
			{canEdit ? (
				<FileEditor
					file={file}
					initialContent={initialContent}
					initialContentType={initialContentType}
					root={root}
				/>
			) : (
				<FilePreview
					contentType={initialContentType}
					file={file}
					hasHotTextBody={revisionContent !== undefined}
				/>
			)}
			<FileFacts
				actions={actions}
				file={file}
				hasBody={revisionContent !== undefined}
				onSelectAction={onSelectAction}
				path={path}
				revisions={revisions}
			/>
		</div>
	);
}

export function MoveFilePanel({ file, path, root }: { file: Doc<'files'>; path: string; root: Id<'files'> }) {
	//
	return <RenameFileForm file={file} path={path} root={root} />;
}

export function TagFilePanel({ file, root }: { file: Doc<'files'>; root: Id<'files'> }) {
	//
	return <TagFileForm file={file} root={root} />;
}

function FileEditor({
	file,
	initialContent,
	initialContentType,
	root,
}: {
	file: Doc<'files'>;
	initialContent: string;
	initialContentType: string;
	root: Id<'files'>;
}) {
	//
	const { act, isActing } = useAct();
	const [content, setContent] = useState(initialContent);
	const [contentType, setContentType] = useState(initialContentType);
	const [result, setResult] = useState('');
	const hasChanges = content !== initialContent || contentType !== initialContentType;

	useEffect(() => {
		setContent(initialContent);
		setContentType(initialContentType);
		setResult('');
	}, [file._id, file.currentRevision, initialContent, initialContentType]);

	const handleSave = async () => {
		//
		try {
			const next = await act([
				{
					root,
					skill: 'write',
					input: {
						fileId: file._id,
						content,
						contentType: contentType.trim() || undefined,
						expectedRevisionId: file.currentRevision,
					},
				},
			]);
			setResult(formatJson(next));
		} catch (error) {
			setResult(formatError(error));
		}
	};

	const handleSubmit = async (event: FormEvent) => {
		//
		event.preventDefault();
		await handleSave();
	};

	const handleReset = () => {
		//
		setContent(initialContent);
		setContentType(initialContentType);
		setResult('');
	};

	return (
		<Card className="min-w-0 overflow-hidden">
			<CardHeader className="pb-3">
				<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
					<div className="min-w-0">
						<CardTitle className="flex items-center gap-2 truncate">
							<FileText className="size-5 shrink-0" />
							<span className="truncate">{file.name}</span>
						</CardTitle>
					</div>
					<Badge variant={hasChanges ? 'default' : 'secondary'}>{hasChanges ? 'edited' : 'saved'}</Badge>
				</div>
			</CardHeader>
			<CardContent className="min-w-0">
				<form className="flex min-h-0 flex-col gap-3" onSubmit={handleSubmit}>
					<div className="grid gap-2">
						<Label htmlFor="file-content-type">content type</Label>
						<Input
							id="file-content-type"
							data-testid="test-console-file-content-type"
							value={contentType}
							onChange={(event) => setContentType(event.target.value)}
						/>
					</div>
					<Textarea
						className="min-h-48 max-w-full resize-y font-mono text-xs"
						data-testid="test-console-file-content"
						value={content}
						onChange={(event) => setContent(event.target.value)}
					/>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							disabled={isActing || !hasChanges}
							data-testid="test-console-save-file"
							onClick={handleSave}
						>
							<Save className="mr-2 size-4" />
							Save
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={isActing || !hasChanges}
							onClick={handleReset}
						>
							<RotateCcw className="mr-2 size-4" />
							Reset
						</Button>
					</div>
					<Result value={result} />
				</form>
			</CardContent>
		</Card>
	);
}

function FilePreview({
	contentType,
	file,
	hasHotTextBody,
}: {
	contentType: string;
	file: Doc<'files'>;
	hasHotTextBody: boolean;
}) {
	//
	const createReadUrl = useAction(api.files.createReadUrl);
	const [readUrl, setReadUrl] = useState('');
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const mediaKind = mediaKindForContentType(contentType);
	const reason = previewReason({
		contentType,
		hasHotTextBody,
		size: file.size,
	});

	useEffect(() => {
		setReadUrl('');
		setError('');
		setIsLoading(false);
	}, [file._id, file.currentRevision]);

	const handleLoad = async () => {
		//
		if (readUrl || isLoading) return;

		setIsLoading(true);
		setError('');

		try {
			const result = await createReadUrl({ file: file._id });
			if (mediaKind === 'download') {
				downloadFile({ fileName: file.name, readUrl: result.readUrl });
				return;
			}

			setReadUrl(result.readUrl);
		} catch (nextError) {
			setError(formatError(nextError));
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className="min-w-0 overflow-hidden">
			<CardHeader className="pb-3">
				<CardTitle className="flex min-w-0 items-center gap-2">
					<FileText className="size-5 shrink-0" />
					<span className="min-w-0 truncate">{file.name}</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="grid min-w-0 gap-3">
				<div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">{reason}</div>

				{error ? (
					<div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs break-words">
						{error}
					</div>
				) : null}

				{readUrl && mediaKind !== 'download' ? (
					<InlinePreview fileName={file.name} kind={mediaKind} readUrl={readUrl} />
				) : (
					<Button
						type="button"
						variant="outline"
						className="w-fit max-w-full"
						disabled={isLoading}
						onClick={handleLoad}
					>
						{mediaKind === 'download' ? (
							<Download className="mr-2 size-4" />
						) : (
							<FileText className="mr-2 size-4" />
						)}
						{isLoading ? 'Preparing...' : previewButtonLabel(mediaKind)}
					</Button>
				)}
			</CardContent>
		</Card>
	);
}

function InlinePreview({
	fileName,
	kind,
	readUrl,
}: {
	fileName: string;
	kind: 'audio' | 'image' | 'video' | 'download';
	readUrl: string;
}) {
	//
	if (kind === 'audio') {
		// oxlint-disable-next-line jsx-a11y/media-has-caption -- raw user-file previews do not have guaranteed caption tracks
		return <audio controls className="w-full max-w-full" src={readUrl} />;
	}

	if (kind === 'video') {
		// oxlint-disable-next-line jsx-a11y/media-has-caption -- raw user-file previews do not have guaranteed caption tracks
		return <video controls className="max-h-96 w-full max-w-full rounded-md border" src={readUrl} />;
	}

	if (kind === 'image') {
		return <img alt={fileName} className="max-h-96 max-w-full rounded-md border object-contain" src={readUrl} />;
	}

	return (
		<Button asChild className="w-fit max-w-full">
			<a href={readUrl} download={fileName}>
				<Download className="mr-2 size-4" />
				Download
			</a>
		</Button>
	);
}

function previewButtonLabel(kind: 'audio' | 'image' | 'video' | 'download') {
	//
	if (kind === 'download') return 'Download';
	if (kind === 'audio') return 'Load audio preview';
	if (kind === 'video') return 'Load video preview';

	return 'Load image preview';
}

function downloadFile({ fileName, readUrl }: { fileName: string; readUrl: string }) {
	//
	const link = document.createElement('a');
	link.href = readUrl;
	link.download = fileName;
	link.rel = 'noopener';
	document.body.append(link);
	link.click();
	link.remove();
}

function RenameFileForm({ file, path, root }: { file: Doc<'files'>; path: string; root: Id<'files'> }) {
	//
	const { act, isActing } = useAct();
	const navigate = useNavigate();
	const [name, setName] = useState(file.name);
	const [result, setResult] = useState('');

	useEffect(() => {
		setName(file.name);
		setResult('');
	}, [file._id, file.name]);

	const handleSubmit = async (event: FormEvent) => {
		//
		event.preventDefault();
		const nextName = name.trim();
		if (!nextName || nextName === file.name) return;

		try {
			const next = await act([
				{
					root,
					skill: 'move',
					input: {
						fileId: file._id,
						name: nextName,
					},
				},
			]);
			setResult(formatJson(next));
			await navigate({ to: '/$', params: { _splat: joinPath(dirname(path), nextName) } });
		} catch (error) {
			setResult(formatError(error));
		}
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<Move className="size-4" />
					Rename
				</CardTitle>
				<CardDescription>Uses Reactor move.</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="grid gap-2" onSubmit={handleSubmit}>
					<Label htmlFor="rename-file">name</Label>
					<Input
						id="rename-file"
						data-testid="test-console-rename-file"
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>
					<Button type="submit" disabled={isActing || !name.trim() || name.trim() === file.name}>
						Rename
					</Button>
					<Result value={result} />
				</form>
			</CardContent>
		</Card>
	);
}

function TagFileForm({ file, root }: { file: Doc<'files'>; root: Id<'files'> }) {
	//
	const { act, isActing } = useAct();
	const [key, setKey] = useState('kind');
	const [value, setValue] = useState('task');
	const [result, setResult] = useState('');

	const handleTag = async (event: FormEvent) => {
		//
		event.preventDefault();
		const nextKey = key.trim();
		if (!nextKey) return;

		try {
			const next = await act([
				{
					root,
					skill: 'tag',
					input: {
						fileId: file._id,
						key: nextKey,
						value: value.trim() || undefined,
					},
				},
			]);
			setResult(formatJson(next));
		} catch (error) {
			setResult(formatError(error));
		}
	};

	const handleUntag = async () => {
		//
		const nextKey = key.trim();
		if (!nextKey) return;

		try {
			const next = await act([
				{
					root,
					skill: 'untag',
					input: {
						fileId: file._id,
						key: nextKey,
					},
				},
			]);
			setResult(formatJson(next));
		} catch (error) {
			setResult(formatError(error));
		}
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<Tag className="size-4" />
					Tags
				</CardTitle>
				<CardDescription>Uses Reactor tag/untag.</CardDescription>
			</CardHeader>
			<CardContent>
				<form className="grid gap-2" onSubmit={handleTag}>
					<Label htmlFor="tag-key">key</Label>
					<Input
						id="tag-key"
						data-testid="test-console-tag-key"
						value={key}
						onChange={(event) => setKey(event.target.value)}
					/>
					<Label htmlFor="tag-value">value</Label>
					<Input
						id="tag-value"
						data-testid="test-console-tag-value"
						value={value}
						onChange={(event) => setValue(event.target.value)}
					/>
					<div className="flex flex-wrap gap-2">
						<Button type="submit" disabled={isActing || !key.trim()}>
							Tag
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={isActing || !key.trim()}
							onClick={handleUntag}
						>
							Untag
						</Button>
					</div>
					<Result value={result} />
				</form>
			</CardContent>
		</Card>
	);
}

function FileFacts({
	actions,
	file,
	hasBody,
	onSelectAction,
	path,
	revisions,
}: {
	actions: Array<Doc<'actions'>>;
	file: Doc<'files'>;
	hasBody: boolean;
	onSelectAction: (actionId: string) => void;
	path: string;
	revisions: Array<Doc<'file_revisions'>>;
}) {
	//
	return (
		<Card className="min-w-0 overflow-hidden">
			<CardHeader>
				<CardTitle className="text-base">Metadata</CardTitle>
			</CardHeader>
			<CardContent className="flex min-w-0 flex-col gap-3">
				<dl className="grid gap-2 text-sm">
					<Field label="path" value={absolutePath(path)} />
					<Field label="id" value={<FileReference path={path} value={file._id} />} />
					<Field label="revision" value={file.currentRevision ?? 'none'} />
					<Field label="content type" value={file.contentType ?? 'unknown'} />
					<Field label="size" value={file.size === undefined ? 'unknown' : `${file.size} bytes`} />
					<Field label="hash" value={file.hash ?? 'none'} />
					<Field
						label="author"
						value={
							<ActionReference actions={actions} onSelectAction={onSelectAction} value={file.author} />
						}
					/>
				</dl>

				{hasBody ? null : (
					<div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
						Body was not available from the hot revision patch.
					</div>
				)}

				<Separator />

				<div className="flex flex-col gap-2">
					<h3 className="text-sm font-medium">Revisions</h3>
					{revisions.length === 0 ? (
						<p className="text-sm text-muted-foreground">No revisions.</p>
					) : (
						<div className="min-w-0 max-h-96 overflow-y-auto overflow-x-hidden rounded-md border">
							{revisions.map((revision) => (
								<div key={revision._id} className="min-w-0 border-b p-2 text-xs last:border-b-0">
									<div className="flex min-w-0 items-center justify-between gap-2">
										<span className="font-mono">{revision.changeKind}</span>
										<Badge
											variant={revision._id === file.currentRevision ? 'default' : 'secondary'}
										>
											{revision._id === file.currentRevision ? 'current' : 'past'}
										</Badge>
									</div>
									<div className="mt-1 min-w-0 text-muted-foreground">
										action{' '}
										<ActionReference
											actions={actions}
											onSelectAction={onSelectAction}
											value={revision.action}
										/>
									</div>
									<div className="min-w-0 break-all text-muted-foreground">
										{revision.beforePath ?? 'none'} -&gt; {revision.afterPath ?? 'none'}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function isEditableTextFile({ content, contentType, size }: { content?: string; contentType: string; size?: number }) {
	//
	if (content === undefined) return false;
	if (size !== undefined && size > maxEditableBytes) return false;

	return isTextContentType(contentType);
}

function isTextContentType(contentType: string) {
	//
	const normalized = contentType.toLowerCase();
	if (normalized.startsWith('text/')) return true;
	if (normalized.includes('json')) return true;
	if (normalized.includes('xml')) return true;
	if (normalized.includes('javascript')) return true;
	if (normalized.includes('typescript')) return true;
	if (normalized.includes('mdx')) return true;

	return normalized === 'image/svg+xml';
}

function mediaKindForContentType(contentType: string) {
	//
	const normalized = contentType.toLowerCase();
	if (normalized.startsWith('audio/')) return 'audio';
	if (normalized.startsWith('video/')) return 'video';
	if (normalized.startsWith('image/')) return 'image';

	return 'download';
}

function previewReason({
	contentType,
	hasHotTextBody,
	size,
}: {
	contentType: string;
	hasHotTextBody: boolean;
	size?: number;
}) {
	//
	if (isTextContentType(contentType) && size !== undefined && size > maxEditableBytes) {
		return `This text file is too large for the editor (${formatSize(size)}).`;
	}

	if (isTextContentType(contentType) && !hasHotTextBody) {
		return 'This text file is not available in the hot revision cache.';
	}

	if (mediaKindForContentType(contentType) !== 'download') return 'Native preview.';

	return 'No inline preview for this file type.';
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
