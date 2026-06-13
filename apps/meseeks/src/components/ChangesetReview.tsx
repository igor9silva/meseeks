import { PatchDiff } from '@pierre/diffs/react';
import { Button, cn } from '@reactor/ui';
import { useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';
import { GitCompareArrows, RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Section } from './Section';
import { StatusPill } from './StatusPill';
import { buildPatch, shortId } from './utils';

interface Props {
	//
	directory: Id<'files'>;
	onDone: (message: string) => void;
}

export function ChangesetReview({ directory, onDone }: Props) {
	//
	const changesets = useQuery(api.changesets.listChangesets, { directory });
	const revertChangeset = useMutation(api.changesets.revertChangeset);
	const [selectedChangeset, setSelectedChangeset] = useState<Id<'changesets'>>();
	const [isReverting, setIsReverting] = useState(false);

	useEffect(() => {
		if (!selectedChangeset && changesets?.[0]) setSelectedChangeset(changesets[0]._id);
	}, [changesets, selectedChangeset]);

	const selected = changesets?.find((changeset) => changeset._id === selectedChangeset) ?? changesets?.[0];
	const changed = [...(selected?.created ?? []), ...(selected?.updated ?? []), ...(selected?.deleted ?? [])];
	const diffable = changed.find((entry) => entry.beforeContent !== undefined || entry.afterContent !== undefined);
	const canRevert = Boolean(selected && selected.reviewState === 'applied');

	const revertSelected = async () => {
		//
		if (!selected || !canRevert) return;
		setIsReverting(true);
		try {
			await revertChangeset({ changeset: selected._id });
			onDone('Changeset revert action recorded.');
		} catch (error) {
			onDone(error instanceof Error ? error.message : 'Changeset revert failed.');
		} finally {
			setIsReverting(false);
		}
	};

	return (
		<Section
			title="Changeset Review"
			icon={<GitCompareArrows className="size-3.5" />}
			className="max-h-[520px] overflow-auto"
		>
			<div className="mb-2 grid gap-1">
				{(changesets ?? []).map((changeset) => (
					<button
						type="button"
						key={changeset._id}
						className={cn(
							'rounded border border-border px-2 py-2 text-left text-xs hover:bg-muted',
							selected?._id === changeset._id && 'bg-muted',
						)}
						onClick={() => setSelectedChangeset(changeset._id)}
					>
						<div className="flex items-center justify-between gap-2">
							<span className="font-mono">{shortId(changeset._id)}</span>
							<StatusPill status={changeset.reviewState} />
						</div>
						<div className="text-muted-foreground">
							{changeset.created.length} created · {changeset.updated.length} updated ·{' '}
							{changeset.deleted.length} deleted
						</div>
					</button>
				))}
			</div>
			{selected && (
				<div className="rounded border border-border p-2">
					<div className="mb-2 flex items-center justify-between gap-2">
						<div className="min-w-0 truncate text-xs text-muted-foreground">
							changeset {shortId(selected._id)}
						</div>
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="rounded"
							title="Revert changeset"
							aria-label="Revert changeset"
							disabled={!canRevert || isReverting}
							onClick={revertSelected}
						>
							<RefreshCcw className="size-3.5" />
							Revert
						</Button>
					</div>
					<div className="mb-2 grid gap-1 text-xs">
						{changed.map((entry) => (
							<div
								key={`${entry.path}-${entry.afterRevision ?? entry.beforeRevision}`}
								className="flex items-center justify-between gap-2"
							>
								<span className="min-w-0 truncate font-mono">{entry.path}</span>
								<span className="text-muted-foreground">
									{shortId(entry.afterRevision ?? entry.beforeRevision)}
								</span>
							</div>
						))}
					</div>
					{diffable ? (
						<div className="overflow-auto rounded border border-border bg-background text-xs">
							<PatchDiff
								patch={buildPatch({
									path: diffable.path,
									before: diffable.beforeContent,
									after: diffable.afterContent,
								})}
								disableWorkerPool={true}
							/>
						</div>
					) : (
						<div className="rounded border border-dashed border-border p-3 text-xs text-muted-foreground">
							metadata-only changeset
						</div>
					)}
				</div>
			)}
		</Section>
	);
}
