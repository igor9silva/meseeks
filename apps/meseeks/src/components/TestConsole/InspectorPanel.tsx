import type { Doc, Id } from 'convex/_generated/dataModel';
import { Suspense, useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@reactor/ui/tabs';
import { ActionDetailsEmpty, ActionDetailsFallback, ActionDetailsPanel } from './ActionDetailsPanel';
import { DirectoryWorkbench } from './DirectoryWorkbench';
import { FileWorkbench } from './FileWorkbench';

export function InspectorPanel({
	actions,
	isActionSelected,
	onSelectAction,
	root,
	scopeDirectory,
	scopeEntries,
	scopePath,
	selectedAction,
	selectedFile,
	selectedPath,
}: {
	actions: Array<Doc<'actions'>>;
	isActionSelected: boolean;
	onSelectAction: (actionId: string) => void;
	root: Id<'files'>;
	scopeDirectory: Doc<'files'>;
	scopeEntries: Array<Doc<'files'>>;
	scopePath: string;
	selectedAction?: Doc<'actions'>;
	selectedFile?: Doc<'files'>;
	selectedPath?: string;
}) {
	//
	const [tab, setTab] = useState(selectedFile ? 'file' : 'scope');
	const hasSelectedFile = Boolean(selectedFile);
	const selectedFileId = selectedFile?._id;

	useEffect(() => {
		if (isActionSelected) {
			setTab('scope');
			return;
		}

		setTab(hasSelectedFile ? 'file' : 'scope');
	}, [hasSelectedFile, isActionSelected, scopeDirectory._id, selectedFileId]);

	return (
		<Tabs value={tab} onValueChange={setTab} className="flex h-full min-h-0 flex-col overflow-hidden">
			<div className="shrink-0 pb-2">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="scope" className="min-w-0">
						Scope
					</TabsTrigger>
					<TabsTrigger value="file" className="min-w-0" disabled={!selectedFile}>
						File
					</TabsTrigger>
				</TabsList>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
				<TabsContent value="scope" className="mt-0 grid min-w-0 gap-3">
					<DirectoryWorkbench
						actions={actions}
						currentDirectory={scopeDirectory}
						currentPath={scopePath}
						entries={scopeEntries}
						onSelectAction={onSelectAction}
					/>
					{selectedAction ? (
						<Suspense fallback={<ActionDetailsFallback action={selectedAction} />}>
							<ActionDetailsPanel
								action={selectedAction}
								actions={actions}
								onSelectAction={onSelectAction}
							/>
						</Suspense>
					) : (
						<ActionDetailsEmpty />
					)}
				</TabsContent>
				<TabsContent value="file" className="mt-0">
					{selectedFile ? (
						<FileWorkbench
							actions={actions}
							file={selectedFile}
							onSelectAction={onSelectAction}
							path={selectedPath ?? scopePath}
							root={root}
						/>
					) : (
						<div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
							Select a file to edit it.
						</div>
					)}
				</TabsContent>
			</div>
		</Tabs>
	);
}
