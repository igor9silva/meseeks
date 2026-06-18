import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { Doc, Id } from 'convex/_generated/dataModel';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { api } from 'convex/_generated/api';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@reactor/ui/resizable';
import { ConversationPanel } from './ConversationPanel';
import { ExplorerPanel } from './ExplorerPanel';
import { InspectorPanel } from './InspectorPanel';
import { joinPath, pathSegments } from './path';

type ResolvedPath = {
	currentDirectory: Id<'files'>;
	currentPath: string;
	missingPath?: string;
	selectedFile?: Doc<'files'>;
	selectedPath?: string;
	scopeRoot: Id<'files'>;
	scopePath: string;
};

export function TestConsole({ path, root }: { path: string; root: Id<'files'> }) {
	//
	const segments = pathSegments(path);

	return (
		<PathResolver
			builtPath=""
			isInsideControlDirectory={false}
			parent={root}
			remaining={segments}
			scopeRoot={root}
			scopePath=""
			render={(resolved) => <ResolvedConsole resolved={resolved} root={root} />}
		/>
	);
}

function PathResolver({
	builtPath,
	isInsideControlDirectory,
	parent,
	remaining,
	render,
	scopeRoot,
	scopePath,
}: {
	builtPath: string;
	isInsideControlDirectory: boolean;
	parent: Id<'files'>;
	remaining: Array<string>;
	render: (resolved: ResolvedPath) => ReactNode;
	scopeRoot: Id<'files'>;
	scopePath: string;
}) {
	//
	const childrenQuery = convexQuery(api.files.list, { parent });
	const { data: children } = useSuspenseQuery(childrenQuery);
	const [segment, ...nextRemaining] = remaining;
	const hasScopeMarker =
		!isInsideControlDirectory && children.some((entry) => entry.kind === 'directory' && entry.name === '.pro');
	const currentScopeRoot = hasScopeMarker ? parent : scopeRoot;
	const currentScopePath = hasScopeMarker ? builtPath : scopePath;

	if (!segment) {
		return render({
			currentDirectory: parent,
			currentPath: builtPath,
			scopeRoot: currentScopeRoot,
			scopePath: currentScopePath,
		});
	}

	const match = children.find((entry) => entry.name === segment);
	const nextPath = joinPath(builtPath, segment);

	if (!match) {
		return render({
			currentDirectory: parent,
			currentPath: builtPath,
			missingPath: nextPath,
			scopeRoot: currentScopeRoot,
			scopePath: currentScopePath,
		});
	}

	if (match.kind === 'file') {
		if (nextRemaining.length === 0) {
			return render({
				currentDirectory: parent,
				currentPath: builtPath,
				selectedFile: match,
				selectedPath: nextPath,
				scopeRoot: currentScopeRoot,
				scopePath: currentScopePath,
			});
		}

		return render({
			currentDirectory: parent,
			currentPath: builtPath,
			missingPath: [nextPath].concat(nextRemaining).join('/'),
			selectedFile: match,
			selectedPath: nextPath,
			scopeRoot: currentScopeRoot,
			scopePath: currentScopePath,
		});
	}

	const nextIsInsideControlDirectory = isInsideControlDirectory || match.name === '.pro';

	return (
		<PathResolver
			builtPath={nextPath}
			isInsideControlDirectory={nextIsInsideControlDirectory}
			parent={match._id}
			remaining={nextRemaining}
			scopeRoot={currentScopeRoot}
			scopePath={currentScopePath}
			render={render}
		/>
	);
}

function ResolvedConsole({ resolved, root }: { resolved: ResolvedPath; root: Id<'files'> }) {
	//
	const directoryQuery = convexQuery(api.files.find, { file: resolved.currentDirectory });
	const childrenQuery = convexQuery(api.files.list, { parent: resolved.currentDirectory });
	const scopeQuery = convexQuery(api.files.find, { file: resolved.scopeRoot });
	const scopeChildrenQuery = convexQuery(api.files.list, { parent: resolved.scopeRoot });
	const actionsQuery = convexQuery(api.actions.listByRoot, { root: resolved.scopeRoot, limit: 50 });
	const { data: currentDirectory } = useSuspenseQuery(directoryQuery);
	const { data: children } = useSuspenseQuery(childrenQuery);
	const { data: scopeDirectory } = useSuspenseQuery(scopeQuery);
	const { data: scopeChildren } = useSuspenseQuery(scopeChildrenQuery);
	const { data: actions } = useSuspenseQuery(actionsQuery);
	const orderedActions = actions.slice().sort((left, right) => left.index - right.index);
	const [selectedActionId, setSelectedActionId] = useState('');
	const selectedAction =
		orderedActions.find((action) => action._id === selectedActionId) ?? orderedActions[orderedActions.length - 1];
	const isActionSelected = Boolean(selectedActionId);

	useEffect(() => {
		setSelectedActionId('');
	}, [resolved.currentDirectory, resolved.scopeRoot, resolved.selectedFile?._id]);

	return (
		<div className="flex h-full min-h-0 flex-col">
			<ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1 overflow-hidden bg-muted/30 p-3">
				<ResizablePanel id="explorer" order={0} defaultSize={22} minSize={15} maxSize={40}>
					<aside className="h-full min-h-0 min-w-0 overflow-hidden pr-2">
						<ExplorerPanel
							currentDirectory={currentDirectory}
							currentPath={resolved.currentPath}
							entries={children}
							missingPath={resolved.missingPath}
							root={root}
							scopeRoot={resolved.scopeRoot}
							selectedFile={resolved.selectedFile}
						/>
					</aside>
				</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel id="inspector" order={1} defaultSize={35} minSize={22} maxSize={50}>
					<main className="h-full min-h-0 min-w-0 overflow-hidden px-2">
						<InspectorPanel
							actions={orderedActions}
							isActionSelected={isActionSelected}
							onSelectAction={setSelectedActionId}
							root={resolved.scopeRoot}
							scopeDirectory={scopeDirectory}
							scopeEntries={scopeChildren}
							scopePath={resolved.scopePath}
							selectedFile={resolved.selectedFile}
							selectedPath={resolved.selectedPath}
							selectedAction={selectedAction}
						/>
					</main>
				</ResizablePanel>
				<ResizableHandle />
				<ResizablePanel id="actions" order={2} defaultSize={43} minSize={25}>
					<aside className="h-full min-h-0 min-w-0 overflow-hidden pl-2">
						<ConversationPanel
							actions={orderedActions}
							currentDirectory={resolved.currentDirectory}
							currentPath={resolved.currentPath}
							selectedAction={selectedAction}
							selectedFile={resolved.selectedFile}
							selectedPath={resolved.selectedPath}
							onSelectAction={setSelectedActionId}
							root={resolved.scopeRoot}
							scopePath={resolved.scopePath}
						/>
					</aside>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
