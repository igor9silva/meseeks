import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import type { Doc, Id } from 'convex/_generated/dataModel';
import type { ReactNode } from 'react';
import { api } from 'convex/_generated/api';
import { FileDiff, ReceiptText } from 'lucide-react';
import { Badge } from '@reactor/ui/badge';
import { Button } from '@reactor/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@reactor/ui/card';
import { Separator } from '@reactor/ui/separator';
import { DiffViewer } from './DiffViewer';
import { ActionReference, FileReference } from './References';
import { normalizePath } from './path';
import { contentFromPatch, contentPairFromPatch } from './revisions';
import { formatJson } from './shared';

export function ActionDetailsPanel({
	action,
	actions,
	onSelectAction,
}: {
	action: Doc<'actions'>;
	actions: Array<Doc<'actions'>>;
	onSelectAction: (actionId: string) => void;
}) {
	//
	const detailsQuery = convexQuery(api.action.details.find, { actionId: action._id });
	const revisionsQuery = convexQuery(api.files.listRevisionsByAction, { action: action._id });
	const { data: details } = useSuspenseQuery(detailsQuery);
	const { data: revisions } = useSuspenseQuery(revisionsQuery);
	const outputRevision = action.output ? revisions.find((revision) => revision.file === action.output) : undefined;
	const outputContent = contentFromPatch(outputRevision?.patch);
	const cause = details.find(isReactionTriggerDetail);

	return (
		<Card className="min-w-0 overflow-hidden">
			<CardHeader className="min-w-0 border-b pb-3">
				<CardTitle className="flex min-w-0 items-center justify-between gap-3 text-base">
					<span className="flex min-w-0 items-center gap-2">
						<ReceiptText className="size-4 shrink-0" />
						<span className="truncate">Action #{action.index}</span>
					</span>
					<span className="flex shrink-0 items-center gap-2 font-mono text-xs font-normal">
						<Badge variant="outline">{action.skill}</Badge>
						<Badge variant="secondary">{action.status}</Badge>
					</span>
				</CardTitle>
				<CardDescription className="break-all font-mono text-xs">
					<ActionReference actions={actions} onSelectAction={onSelectAction} value={action._id} />
				</CardDescription>
			</CardHeader>
			<CardContent className="grid min-w-0 gap-3 p-4">
				<div className="grid gap-2 text-xs sm:grid-cols-2">
					<ActionMeta label="id">
						<ActionReference actions={actions} onSelectAction={onSelectAction} value={action._id} />
					</ActionMeta>
					<ActionMeta label="author">
						<ActionReference actions={actions} onSelectAction={onSelectAction} value={action.author} />
					</ActionMeta>
					<ActionMeta label="spark">
						<ActionReference actions={actions} onSelectAction={onSelectAction} value={action.spark} />
					</ActionMeta>
					<ActionMeta label="output">
						{action.output && outputRevision?.afterPath ? (
							<FileReference path={outputRevision.afterPath} value={action.output} />
						) : (
							<span className="font-mono text-xs">{action.output ?? 'none'}</span>
						)}
					</ActionMeta>
				</div>

				<Separator />

				{cause ? (
					<>
						<TriggerCause detail={cause} actions={actions} onSelectAction={onSelectAction} />
						<Separator />
					</>
				) : null}

				{action.output || outputRevision ? (
					<div className="min-w-0">
						<h3 className="mb-2 text-sm font-medium">Output</h3>
						<div className="rounded-md border p-2 text-xs">
							{outputRevision?.afterPath ? (
								<PathLink path={outputRevision.afterPath} label="file" />
							) : null}
							{outputContent ? (
								<pre className="mt-2 max-h-56 overflow-y-auto overflow-x-hidden rounded-md bg-muted p-2 whitespace-pre-wrap break-words">
									{outputContent}
								</pre>
							) : (
								<p className="text-muted-foreground">No hot output body available.</p>
							)}
						</div>
					</div>
				) : null}

				<div className="min-w-0">
					<h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
						<FileDiff className="size-4" />
						Changeset
					</h3>
					{revisions.length === 0 ? (
						<p className="text-sm text-muted-foreground">No file revisions.</p>
					) : (
						<div className="min-w-0 rounded-md border">
							{revisions.map((revision) => (
								<div
									key={revision._id}
									className="grid min-w-0 gap-2 border-b p-2 text-xs last:border-b-0"
								>
									<div className="flex min-w-0 items-center justify-between gap-2">
										<Badge variant="secondary">{revision.changeKind}</Badge>
										<span className="min-w-0 break-all font-mono text-muted-foreground">
											{revision._id}
										</span>
									</div>
									<div className="mt-1 flex min-w-0 flex-col gap-1">
										<PathLink path={revision.beforePath} label="before" />
										<PathLink path={revision.afterPath} label="after" />
									</div>
									<DiffViewer content={contentPairFromPatch(revision.patch)} />
								</div>
							))}
						</div>
					)}
				</div>

				<div className="min-w-0">
					<h3 className="mb-2 text-sm font-medium">Details</h3>
					<DetailRows details={details} />
				</div>
			</CardContent>
		</Card>
	);
}

type TriggerActionDetail = Extract<Doc<'action_details'>, { kind: 'trigger' }>;
type ReactionTriggerDetail = TriggerActionDetail & { sourceAction: Id<'actions'> };

function isReactionTriggerDetail(detail: Doc<'action_details'>): detail is ReactionTriggerDetail {
	//
	return detail.kind === 'trigger' && Boolean(detail.sourceAction);
}

function TriggerCause({
	actions,
	detail,
	onSelectAction,
}: {
	actions: Array<Doc<'actions'>>;
	detail: ReactionTriggerDetail;
	onSelectAction: (actionId: string) => void;
}) {
	//
	return (
		<div className="min-w-0">
			<h3 className="mb-2 text-sm font-medium">Cause</h3>
			<div className="grid min-w-0 gap-2 rounded-md border p-2 text-xs">
				<ActionMeta label="trigger">
					{detail.sourcePath ? (
						<PathLink path={detail.sourcePath} label="source" />
					) : (
						<span className="font-mono text-xs break-all">{detail.trigger ?? 'unknown'}</span>
					)}
				</ActionMeta>
				<ActionMeta label="source action">
					<ActionReference actions={actions} onSelectAction={onSelectAction} value={detail.sourceAction} />
				</ActionMeta>
				{detail.compiledBy ? (
					<ActionMeta label="compiled by">
						<ActionReference actions={actions} onSelectAction={onSelectAction} value={detail.compiledBy} />
						{detail.compiledAt ? (
							<span className="ml-1 text-muted-foreground">
								{new Date(detail.compiledAt).toLocaleTimeString()}
							</span>
						) : null}
					</ActionMeta>
				) : null}
				<ActionMeta label="matched">
					{detail.matchedPaths && detail.matchedPaths.length > 0 ? (
						<div className="grid min-w-0 gap-1">
							{detail.matchedPaths.map((path) => (
								<PathLink key={path} path={path} label="file" />
							))}
						</div>
					) : detail.matchedRevisions && detail.matchedRevisions.length > 0 ? (
						<div className="grid min-w-0 gap-1 font-mono text-xs break-all">
							{detail.matchedRevisions.map((revision) => (
								<span key={revision}>{revision}</span>
							))}
						</div>
					) : (
						<span className="text-muted-foreground">none</span>
					)}
				</ActionMeta>
			</div>
		</div>
	);
}

export function ActionDetailsEmpty() {
	//
	return (
		<Card>
			<CardContent className="flex min-h-48 items-center justify-center p-4 text-sm text-muted-foreground">
				Select an action to inspect output, revisions, details, and diffs.
			</CardContent>
		</Card>
	);
}

export function ActionDetailsFallback({ action }: { action: Doc<'actions'> }) {
	//
	return (
		<Card className="flex h-full min-h-0 flex-col overflow-hidden">
			<CardHeader className="shrink-0 border-b pb-3">
				<CardTitle className="text-base">Action #{action.index}</CardTitle>
				<CardDescription>
					{action.skill} - {action.status}
				</CardDescription>
			</CardHeader>
			<CardContent className="p-4">
				<div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">Loading details...</div>
			</CardContent>
		</Card>
	);
}

function ActionMeta({ children, label }: { children: ReactNode; label: string }) {
	//
	return (
		<div className="min-w-0">
			<div className="text-muted-foreground">{label}</div>
			<div className="min-w-0 break-all">{children}</div>
		</div>
	);
}

function DetailRows({ details }: { details: Array<Doc<'action_details'>> }) {
	//
	if (details.length === 0) {
		return <p className="text-sm text-muted-foreground">No details.</p>;
	}

	return (
		<div className="grid min-w-0 gap-2">
			{details.map((detail, index) => (
				<details key={detail._id} className="min-w-0 rounded-md border bg-muted/30 text-xs">
					<summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-2 p-2">
						<span className="min-w-0 truncate font-medium">{detailTitle(detail, index)}</span>
						<span className="shrink-0 text-muted-foreground">
							{new Date(detail.createdAt).toLocaleTimeString()}
						</span>
					</summary>
					<pre className="min-w-0 max-w-full overflow-hidden border-t bg-background p-2 whitespace-pre-wrap break-all">
						{formatJson(detail)}
					</pre>
				</details>
			))}
		</div>
	);
}

function detailTitle(detail: Doc<'action_details'>, index: number) {
	//
	if (detail.kind === 'preparation') return `#${index + 1} preparation · ${detail.skillKind} · ${detail.skill}`;
	if (detail.kind === 'provider')
		return `#${index + 1} provider · ${detail.provider}${detail.model ? ` · ${detail.model}` : ''}`;
	if (detail.kind === 'box') return `#${index + 1} box · ${detail.provider} · ${detail.providerBoxId}`;
	if (detail.kind === 'trigger' && detail.sourceAction) return `#${index + 1} trigger · matched`;
	if (detail.kind === 'trigger') return `#${index + 1} trigger · ${detail.acceptedActions?.length ?? 0} accepted`;
	if (detail.kind === 'reaction') return `#${index + 1} reaction · ${detail.acceptedActions.length} accepted`;
	if (detail.kind === 'file') return `#${index + 1} file · ${detail.paths?.length ?? 0} paths`;
	if (detail.kind === 'upload') return `#${index + 1} upload · ${detail.name}`;
	if (detail.kind === 'error') return `#${index + 1} error · ${detail.message}`;

	return `#${index + 1} detail`;
}

function PathLink({ label, path }: { label: string; path?: string }) {
	//
	if (!path) {
		return <div className="truncate text-muted-foreground">{label}: none</div>;
	}

	return (
		<div className="min-w-0 break-all">
			<span className="text-muted-foreground">{label}: </span>
			<Button
				asChild
				variant="link"
				className="h-auto min-w-0 max-w-full p-0 text-left font-mono text-xs whitespace-normal break-all"
			>
				<Link to="/$" params={{ _splat: normalizePath(path) }}>
					{path}
				</Link>
			</Button>
		</div>
	);
}
