import { ResizablePanel, ResizablePanelGroup } from '@reactor/ui/resizable';
import type { ReactNode } from 'react';
import type { TaskSource } from '~/lib/explorerSearchParams';
import type { TaskConfig } from '~/server/taskIndexSchemas';
import { OrganizerHeader } from './OrganizerHeader';
import { OrganizerResizableHandle } from './OrganizerResizableHandle';
import { CollapsedCurrentPanel } from './root/CollapsedCurrentPanel';
import { getSubtasksPanelSize } from './taskConfig';

interface TaskExplorerWorkspaceModel {
	header: {
		currentSource: TaskSource | null;
		currentPath: string;
		currentTitle: string | null;
		shouldBlurPrivateTasks: boolean;
		onCreateTaskOpen: () => void;
		onPrivateBlurToggle: () => void;
	};
	layout: {
		activeConfig: TaskConfig;
		currentPanel: ReactNode;
		taskBoard: ReactNode;
		inspectorPanel: ReactNode;
		expandedContent: ReactNode;
		shouldShowCurrentPanel: boolean;
		shouldShowCurrentPanelRail: boolean;
		shouldShowInspector: boolean;
		onCurrentPanelExpand: () => void;
		onCurrentPanelExpandedToggle: () => void;
		onPanelDragging: (isDragging: boolean) => void;
		onPanelLayout: (sizes: number[]) => void;
	};
}

export function TaskExplorerWorkspace({ model }: { model: TaskExplorerWorkspaceModel }) {
	//
	return (
		<div className="flex h-screen flex-col bg-background text-foreground">
			<OrganizerHeader
				currentSource={model.header.currentSource}
				currentPath={model.header.currentPath}
				currentTitle={model.header.currentTitle}
				shouldBlurPrivateTasks={model.header.shouldBlurPrivateTasks}
				onCreateTaskOpen={model.header.onCreateTaskOpen}
				onPrivateBlurToggle={model.header.onPrivateBlurToggle}
			/>
			<main className="min-h-0 flex-1 p-3">
				<TaskExplorerPanels model={model.layout} />
			</main>
		</div>
	);
}

function TaskExplorerPanels({ model }: { model: TaskExplorerWorkspaceModel['layout'] }) {
	//
	if (model.expandedContent) return model.expandedContent;

	if (!model.shouldShowCurrentPanel && !model.shouldShowInspector && !model.shouldShowCurrentPanelRail) {
		return model.taskBoard;
	}

	return (
		<div className="flex h-full min-h-0 overflow-hidden">
			{model.shouldShowCurrentPanelRail ? (
				<CollapsedCurrentPanel
					onExpand={model.onCurrentPanelExpand}
					onExpandedToggle={model.onCurrentPanelExpandedToggle}
				/>
			) : null}
			<ResizablePanelGroup
				key={`${model.shouldShowCurrentPanel ? 'with-current' : 'without-current'}-${model.shouldShowInspector ? 'with-selected' : 'without-selected'}`}
				direction="horizontal"
				onLayout={model.onPanelLayout}
				className="h-full min-h-0 min-w-0 flex-1 overflow-hidden"
			>
				{model.shouldShowCurrentPanel ? (
					<>
						<ResizablePanel
							key="organizer-current-panel"
							id="organizer-current"
							order={0}
							defaultSize={model.activeConfig.panelSizes.current}
							minSize={16}
							className="min-w-0"
						>
							{model.currentPanel}
						</ResizablePanel>
						<OrganizerResizableHandle onDragging={model.onPanelDragging} />
					</>
				) : null}
				<ResizablePanel
					key="organizer-subtasks-panel"
					id="organizer-subtasks"
					order={model.shouldShowCurrentPanel ? 1 : 0}
					defaultSize={getSubtasksPanelSize(
						model.activeConfig,
						model.shouldShowCurrentPanel,
						model.shouldShowInspector,
					)}
					minSize={30}
					className="min-w-0"
				>
					{model.taskBoard}
				</ResizablePanel>
				{model.shouldShowInspector ? (
					<>
						<OrganizerResizableHandle onDragging={model.onPanelDragging} />
						<ResizablePanel
							key="organizer-selected-panel"
							id="organizer-selected"
							order={model.shouldShowCurrentPanel ? 2 : 1}
							defaultSize={model.activeConfig.panelSizes.selected}
							minSize={22}
							className="min-w-0"
						>
							{model.inspectorPanel}
						</ResizablePanel>
					</>
				) : null}
			</ResizablePanelGroup>
		</div>
	);
}
