import type { Id } from 'convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { AddEnergyItem } from './AddEnergyItem';
import { ClearEnergyItem } from './ClearEnergyItem';
import { DiscardCurrentFileItem } from './DiscardCurrentFileItem';
import { ReopenFileItem } from './ReopenFileItem';
import { ResolveCurrentFileItem } from './ResolveCurrentFileItem';
import { StopReactionsItem } from './StopReactionsItem';

export function CurrentFileActions({ fileId }: { fileId: Id<'files'> | undefined }) {
	//
	const currentFile = useQuery(api.fileViews.findOne, fileId ? { fileId } : 'skip');
	if (!currentFile) return null;

	return (
		<>
			<ResolveCurrentFileItem file={currentFile} />
			<DiscardCurrentFileItem file={currentFile} />
			<AddEnergyItem file={currentFile} />
			<ClearEnergyItem file={currentFile} />
			<ReopenFileItem file={currentFile} />
			<StopReactionsItem file={currentFile} />
		</>
	);
}
