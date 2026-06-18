import { useNavigate } from '@tanstack/react-router';
import type { Doc, Id } from 'convex/_generated/dataModel';
import { api } from 'convex/_generated/api';
import { useConvex } from 'convex/react';
import type { ChangeEvent, FormEvent } from 'react';
import { useState } from 'react';
import { FolderOpen, Upload } from 'lucide-react';
import { Badge } from '@reactor/ui/badge';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@reactor/ui/card';
import { Input } from '@reactor/ui/input';
import { Label } from '@reactor/ui/label';
import { Textarea } from '@reactor/ui/textarea';
import { useAct } from '~/hooks/useAct';
import { upload, type UploadProgress } from '~/lib/upload';
import { ActionReference, FileReference } from './References';
import { absolutePath, joinPath } from './path';
import { Field, Result, formatError, formatJson } from './shared';

type ActFunction = ReturnType<typeof useAct>['act'];

export function DirectoryWorkbench({
	actions,
	currentDirectory,
	currentPath,
	entries,
	onSelectAction,
}: {
	actions: Array<Doc<'actions'>>;
	currentDirectory: Doc<'files'>;
	currentPath: string;
	entries: Array<Doc<'files'>>;
	onSelectAction: (actionId: string) => void;
}) {
	//
	const directoryCount = entries.filter((file) => file.kind === 'directory').length;
	const fileCount = entries.length - directoryCount;

	return (
		<div className="flex min-h-0 flex-col gap-3">
			<Card className="min-w-0 overflow-hidden">
				<CardHeader className="pb-3">
					<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
						<div className="min-w-0">
							<CardTitle className="flex items-center gap-2 truncate text-base">
								<FolderOpen className="size-4 shrink-0" />
								<span className="truncate">{absolutePath(currentPath)}</span>
							</CardTitle>
						</div>
						<div className="flex flex-wrap gap-2">
							<Badge variant="secondary">{directoryCount} dirs</Badge>
							<Badge variant="outline">{fileCount} files</Badge>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<dl className="grid gap-2 text-sm">
						<Field label="id" value={<FileReference path={currentPath} value={currentDirectory._id} />} />
						<Field label="revision" value={currentDirectory.currentRevision ?? 'none'} />
						<Field
							label="author"
							value={
								<ActionReference
									actions={actions}
									onSelectAction={onSelectAction}
									value={currentDirectory.author}
								/>
							}
						/>
					</dl>
				</CardContent>
			</Card>
		</div>
	);
}

export function CreateDirectoryPanel({
	currentDirectory,
	currentPath,
	root = currentDirectory,
}: {
	currentDirectory: Id<'files'>;
	currentPath: string;
	root?: Id<'files'>;
}) {
	//
	return (
		<div className="rounded-md border bg-card p-3">
			<CreateDirectoryForm currentDirectory={currentDirectory} currentPath={currentPath} root={root} />
		</div>
	);
}

export function CreateTextFilePanel({
	currentDirectory,
	currentPath,
	root = currentDirectory,
}: {
	currentDirectory: Id<'files'>;
	currentPath: string;
	root?: Id<'files'>;
}) {
	//
	return (
		<div className="rounded-md border bg-card p-3">
			<CreateTextFileForm currentDirectory={currentDirectory} currentPath={currentPath} root={root} />
		</div>
	);
}

export function UploadFilesPanel({
	currentDirectory,
	currentPath,
	defaultDirectoryName,
	root = currentDirectory,
}: {
	currentDirectory: Id<'files'>;
	currentPath: string;
	defaultDirectoryName?: string;
	root?: Id<'files'>;
}) {
	//
	return (
		<div className="rounded-md border bg-card p-3">
			<UploadFilesForm
				currentDirectory={currentDirectory}
				currentPath={currentPath}
				defaultDirectoryName={defaultDirectoryName}
				root={root}
			/>
		</div>
	);
}

function CreateDirectoryForm({
	currentDirectory,
	currentPath,
	root,
}: {
	currentDirectory: Id<'files'>;
	currentPath: string;
	root: Id<'files'>;
}) {
	//
	const { act, isActing } = useAct();
	const navigate = useNavigate();
	const [name, setName] = useState('');
	const [result, setResult] = useState('');

	const handleSubmit = async (event: FormEvent) => {
		//
		event.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName) return;

		try {
			const next = await act([
				{
					root,
					skill: 'create',
					input: {
						kind: 'directory',
						parentId: currentDirectory,
						name: trimmedName,
					},
				},
			]);
			setResult(formatJson(next));
			setName('');
			await navigate({ to: '/$', params: { _splat: joinPath(currentPath, trimmedName) } });
		} catch (error) {
			setResult(formatError(error));
		}
	};

	return (
		<form className="grid gap-2" onSubmit={handleSubmit}>
			<Label htmlFor="new-directory">Directory</Label>
			<div className="flex gap-2">
				<Input
					id="new-directory"
					data-testid="test-console-new-directory-name"
					value={name}
					onChange={(event) => setName(event.target.value)}
					placeholder="notes"
				/>
				<Button type="submit" disabled={isActing} data-testid="test-console-create-directory">
					Create
				</Button>
			</div>
			<Result value={result} />
		</form>
	);
}

function CreateTextFileForm({
	currentDirectory,
	currentPath,
	root,
}: {
	currentDirectory: Id<'files'>;
	currentPath: string;
	root: Id<'files'>;
}) {
	//
	const { act, isActing } = useAct();
	const navigate = useNavigate();
	const [name, setName] = useState('Task.md');
	const [contentType, setContentType] = useState('text/markdown; charset=utf-8');
	const [content, setContent] = useState('# TODO\n\n- [ ] test PRO\n');
	const [result, setResult] = useState('');

	const handleSubmit = async (event: FormEvent) => {
		//
		event.preventDefault();
		const trimmedName = name.trim();
		if (!trimmedName) return;

		try {
			const next = await act([
				{
					root,
					skill: 'create',
					input: {
						kind: 'file',
						parentId: currentDirectory,
						name: trimmedName,
						content,
						contentType: contentType.trim() || undefined,
					},
				},
			]);
			setResult(formatJson(next));
			await navigate({ to: '/$', params: { _splat: joinPath(currentPath, trimmedName) } });
		} catch (error) {
			setResult(formatError(error));
		}
	};

	return (
		<form className="grid gap-2" onSubmit={handleSubmit}>
			<Label htmlFor="new-file">Text file</Label>
			<Input
				id="new-file"
				data-testid="test-console-new-file-name"
				value={name}
				onChange={(event) => setName(event.target.value)}
			/>
			<Input
				data-testid="test-console-new-file-content-type"
				value={contentType}
				onChange={(event) => setContentType(event.target.value)}
			/>
			<Textarea
				className="min-h-28 font-mono text-xs"
				data-testid="test-console-new-file-content"
				value={content}
				onChange={(event) => setContent(event.target.value)}
			/>
			<Button type="submit" disabled={isActing} data-testid="test-console-create-file">
				Create file
			</Button>
			<Result value={result} />
		</form>
	);
}

function UploadFilesForm({
	currentDirectory,
	currentPath,
	defaultDirectoryName,
	root,
}: {
	currentDirectory: Id<'files'>;
	currentPath: string;
	defaultDirectoryName?: string;
	root: Id<'files'>;
}) {
	//
	const { act, isActing } = useAct();
	const convex = useConvex();
	const navigate = useNavigate();
	const [result, setResult] = useState('');
	const [isUploading, setIsUploading] = useState(false);
	const [uploads, setUploads] = useState<Array<UploadProgress & { error?: string }>>([]);

	const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
		//
		const files = Array.from(event.target.files ?? []);
		if (files.length === 0) return;

		setIsUploading(true);
		setResult('');
		setUploads(files.map((file) => ({ state: 'hashing', file: file.name, total: file.size })));

		try {
			const target = await resolveUploadTarget({
				act,
				convex,
				currentDirectory,
				currentPath,
				defaultDirectoryName,
				root,
			});

			for (let index = 0; index < files.length; index += 1) {
				const file = files[index];
				if (!file) continue;

				await upload({
					file,
					rootId: root,
					parentId: target.directory,
					act,
					findAction: async (action) => await convex.query(api.actions.find, { action }),
					findDetails: async (action) => await convex.query(api.action.details.find, { actionId: action }),
					onProgress: (progress) => {
						setUploads((items) => replaceUploadProgress(items, index, progress));
					},
				});
			}

			const lastName = files.at(-1)?.name ?? '';
			setResult(`Uploaded ${files.length} file${files.length === 1 ? '' : 's'}.`);
			if (lastName) await navigate({ to: '/$', params: { _splat: joinPath(target.path, lastName) } });
		} catch (error) {
			setResult(formatError(error));
			setUploads((items) => markUploadFailed(items, formatError(error)));
		} finally {
			setIsUploading(false);
			event.target.value = '';
		}
	};

	return (
		<div className="grid gap-2">
			<Label htmlFor="upload-files" className="flex items-center gap-2">
				<Upload className="size-4" />
				Upload files
			</Label>
			<div className="text-xs text-muted-foreground">
				Target: {absolutePath(defaultDirectoryName ? joinPath(currentPath, defaultDirectoryName) : currentPath)}
			</div>
			<Input
				id="upload-files"
				type="file"
				multiple
				data-testid="test-console-upload-files"
				disabled={isUploading || isActing}
				onChange={handleUpload}
			/>
			{uploads.length > 0 ? (
				<div className="grid gap-2 rounded-md border p-2">
					{uploads.map((item, index) => (
						<div key={`${item.file}-${index}`} className="grid gap-1 text-xs">
							<div className="flex items-center justify-between gap-2">
								<span className="truncate font-medium">{item.file}</span>
								<span className="shrink-0 text-muted-foreground">{item.state}</span>
							</div>
							<div className="h-1.5 overflow-hidden rounded-full bg-muted">
								<div className="h-full bg-primary" style={{ width: `${uploadPercent(item)}%` }} />
							</div>
							{item.error ? <div className="text-destructive">{item.error}</div> : null}
						</div>
					))}
				</div>
			) : null}
			<Result value={result} />
		</div>
	);
}

async function resolveUploadTarget({
	act,
	convex,
	currentDirectory,
	currentPath,
	defaultDirectoryName,
	root,
}: {
	act: ActFunction;
	convex: ReturnType<typeof useConvex>;
	currentDirectory: Id<'files'>;
	currentPath: string;
	defaultDirectoryName?: string;
	root: Id<'files'>;
}) {
	//
	if (!defaultDirectoryName) {
		return {
			directory: currentDirectory,
			path: currentPath,
		};
	}

	const path = joinPath(currentPath, defaultDirectoryName);
	const existing = await findChildDirectory({
		convex,
		parent: currentDirectory,
		name: defaultDirectoryName,
	});
	if (existing) {
		return {
			directory: existing,
			path,
		};
	}

	const actions = await act([
		{
			root,
			skill: 'create',
			input: {
				kind: 'directory',
				parentId: currentDirectory,
				name: defaultDirectoryName,
			},
		},
	]);
	const action = actions[0];
	if (!action) throw new Error('Action API returned no action id.');

	await waitForActionSuccess({ action, convex });

	const created = await findChildDirectory({
		convex,
		parent: currentDirectory,
		name: defaultDirectoryName,
	});
	if (!created) throw new Error(`Could not find ${defaultDirectoryName} after create action succeeded.`);

	return {
		directory: created,
		path,
	};
}

async function findChildDirectory({
	convex,
	parent,
	name,
}: {
	convex: ReturnType<typeof useConvex>;
	parent: Id<'files'>;
	name: string;
}) {
	//
	const children = await convex.query(api.files.list, { parent });
	const match = children.find((file) => file.name === name);
	if (!match) return undefined;
	if (match.kind !== 'directory') throw new Error(`${name} already exists and is not a directory.`);

	return match._id;
}

async function waitForActionSuccess({
	action,
	convex,
}: {
	action: Id<'actions'>;
	convex: ReturnType<typeof useConvex>;
}) {
	//
	for (let attempt = 0; attempt < 120; attempt += 1) {
		const row = await convex.query(api.actions.find, { action });
		if (row.status === 'succeeded') return;
		if (row.status === 'failed' || row.status === 'skipped') {
			throw new Error(`Action ${row.status}: ${(row.warnings ?? []).join(', ') || 'no details'}`);
		}

		await sleep(500);
	}

	throw new Error('Timed out waiting for directory create action to finish.');
}

function sleep(ms: number) {
	//
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function replaceUploadProgress(
	items: Array<UploadProgress & { error?: string }>,
	index: number,
	progress: UploadProgress,
) {
	//
	return items.map((item, itemIndex) => {
		if (itemIndex !== index) return item;

		return progress;
	});
}

function markUploadFailed(items: Array<UploadProgress & { error?: string }>, error: string) {
	//
	const failed: UploadProgress['state'] = 'failed';

	return items.map((item) => {
		if (item.state === 'done') return item;

		return {
			...item,
			state: failed,
			error,
		};
	});
}

function uploadPercent(item: UploadProgress) {
	//
	if (item.state === 'done') return 100;
	if (!item.total || item.total <= 0) return 0;

	return Math.min(100, Math.round(((item.loaded ?? 0) / item.total) * 100));
}
