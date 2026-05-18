import { useRef } from 'react';
import type { TaskConfig } from '~/server/taskIndexSchemas';
import type { TaskConfigPatch } from './taskConfig';

interface TaskExplorerPanelLayoutInput {
	activeConfig: TaskConfig;
	shouldShowInspector: boolean;
	persistTaskConfigPatch: (patch: TaskConfigPatch) => void;
}

export function useTaskExplorerPanelLayout({
	activeConfig,
	shouldShowInspector,
	persistTaskConfigPatch,
}: TaskExplorerPanelLayoutInput) {
	//
	const isPanelDraggingRef = useRef(false);
	const panelLayoutRef = useRef<number[] | null>(null);

	function persistPanelLayout(sizes: number[]): void {
		//
		const isCurrentPanelVisible = !activeConfig.panels.currentCollapsed;
		const currentSize = isCurrentPanelVisible ? sizes[0] : activeConfig.panelSizes.current;
		const selectedIndex = isCurrentPanelVisible ? 2 : 1;
		const selectedSize = shouldShowInspector
			? (sizes[selectedIndex] ?? activeConfig.panelSizes.selected)
			: activeConfig.panelSizes.selected;
		if (currentSize === undefined) return;

		persistTaskConfigPatch({
			panelSizes: {
				current: currentSize,
				selected: selectedSize,
			},
		});
	}

	const handlePanelLayout = (sizes: number[]) => {
		if (!isPanelDraggingRef.current) return;
		panelLayoutRef.current = sizes;
	};

	const handlePanelDragging = (isDragging: boolean) => {
		isPanelDraggingRef.current = isDragging;

		if (isDragging) return;

		const sizes = panelLayoutRef.current;
		panelLayoutRef.current = null;
		if (sizes === null) return;

		persistPanelLayout(sizes);
	};

	return {
		handlePanelDragging,
		handlePanelLayout,
	};
}
