import { Button, Input, Textarea } from '@reactor/ui';
import { useAction, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Doc, Id } from 'convex/_generated/dataModel';
import { FileClock, History, Save, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Section } from './Section';
import { StatusPill } from './StatusPill';
import { formatTime, shortId } from './utils';

interface Props {
	//
	selectedFile?: Doc<'files'>;
	selectedFolder?: Doc<'files'>;
	activeDirectory: Id<'files'>;
	onSaved: (message: string) => void;
}

export function FilePanel({ selectedFile, selectedFolder, activeDirectory, onSaved }: Props) {
	//
	const content = useQuery(api.files.getFileContent, selectedFile ? { file: selectedFile._id } : 'skip');
	const revisions = useQuery(api.files.listRevisions, selectedFile ? { file: selectedFile._id } : 'skip');
	const fileActions = useQuery(api.files.listActionsForFile, selectedFile ? { file: selectedFile._id } : 'skip');
	const tags = useQuery(api.files.listTags, selectedFile ? { file: selectedFile._id } : 'skip');
	const act = useAction(api.reactor.act);
	const [draft, setDraft] = useState('');
	const [tagKey, setTagKey] = useState('spark');
	const [tagValue, setTagValue] = useState('');
	const contentFileId = content?.file._id;
	const currentContent = content?.content;

	useEffect(() => {
		if (contentFileId) setDraft(currentContent ?? '');
	}, [contentFileId, currentContent]);

	if (!selectedFile) {
		return (
			<Section title="File View" icon={<FileClock className="size-3.5" />} className="min-h-[280px]">
				<div className="rounded border border-dashed border-border p-4 text-sm text-muted-foreground">
					{selectedFolder ? `${selectedFolder.path} is the active folder.` : 'Select a file or folder.'}
				</div>
			</Section>
		);
	}

	const save = async () => {
		//
		await act({
			directory: selectedFile.parent ?? activeDirectory,
			skillKey: 'write',
			args: { file: selectedFile._id, content: draft },
		});
		onSaved('File written.');
	};

	const tag = async () => {
		//
		await act({
			directory: selectedFile.parent ?? activeDirectory,
			skillKey: 'tag',
			args: { file: selectedFile._id, key: tagKey, value: tagValue },
		});
		onSaved('Tag written.');
	};

	return (
		<Section title="File View" icon={<FileClock className="size-3.5" />} className="min-h-[420px]">
			<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
				<div className="min-w-0">
					<div className="truncate text-sm font-semibold">{selectedFile.path}</div>
					<div className="text-xs text-muted-foreground">
						directory {shortId(selectedFile.parent ?? activeDirectory)}
					</div>
				</div>
				<Button type="button" size="sm" className="rounded" onClick={save}>
					<Save className="size-4" />
					Save
				</Button>
			</div>
			<Textarea
				className="min-h-[210px] rounded font-mono text-xs"
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
			/>
			<div className="mt-3 grid gap-2 md:grid-cols-2">
				<div>
					<div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
						<History className="size-3" />
						Revisions
					</div>
					<div className="max-h-32 overflow-auto rounded border border-border">
						{(revisions ?? []).map((revision) => (
							<div
								key={revision._id}
								className="border-b border-border/60 px-2 py-1 text-xs last:border-b-0"
							>
								<div className="font-mono">{shortId(revision._id)}</div>
								<div className="text-muted-foreground">
									{formatTime(revision.createdAt)} · {revision.size} bytes
								</div>
							</div>
						))}
					</div>
				</div>
				<div>
					<div className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
						<Tag className="size-3" />
						Metadata Tags
					</div>
					<div className="mb-2 flex gap-1">
						<Input
							className="h-8 rounded text-xs"
							value={tagKey}
							onChange={(event) => setTagKey(event.target.value)}
						/>
						<Input
							className="h-8 rounded text-xs"
							value={tagValue}
							onChange={(event) => setTagValue(event.target.value)}
						/>
						<Button type="button" size="sm" variant="outline" className="rounded" onClick={tag}>
							<Tag className="size-4" />
						</Button>
					</div>
					<div className="max-h-20 overflow-auto rounded border border-border">
						{(tags ?? []).map((entry) => (
							<div key={entry._id} className="px-2 py-1 text-xs">
								<span className="font-mono">{entry.key}</span>
								{entry.value && <span className="text-muted-foreground">={entry.value}</span>}
							</div>
						))}
					</div>
				</div>
			</div>
			<div className="mt-3">
				<div className="mb-1 text-xs font-medium text-muted-foreground">Actions touching this file</div>
				<div className="max-h-24 overflow-auto rounded border border-border">
					{(fileActions ?? []).map((action) => (
						<div
							key={action._id}
							className="flex items-center justify-between gap-2 border-b border-border/60 px-2 py-1 text-xs last:border-b-0"
						>
							<span>{action.skillKey}</span>
							<StatusPill status={action.status} />
						</div>
					))}
				</div>
			</div>
		</Section>
	);
}
