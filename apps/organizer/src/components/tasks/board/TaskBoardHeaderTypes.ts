import type { PointerEvent } from 'react';
import type { ExplorerQueryInput, ExplorerSort } from '~/lib/explorerSearchParams';
import type { TaskConfig } from '~/server/taskIndexSchemas';
import type { ExplorerFacets, ExplorerHealth, ExplorerTotals } from '../taskExplorerTypes';

export interface TaskBoardHeaderState {
	config: TaskConfig;
	queryInput: ExplorerQueryInput;
	searchDraft: string;
	searchInputId: string;
	health: ExplorerHealth | undefined;
	totals: ExplorerTotals | undefined;
	tagGroups: ExplorerFacets['tagGroups'];
	tagFilterHeight: number;
	isTagFilterDragging: boolean;
	isExpanded: boolean;
	shouldShowIndexUnavailable: boolean;
	shouldShowViewTabs: boolean;
}

export interface TaskBoardHeaderActions {
	onSearchDraftChange: (value: string) => void;
	onTagFilterCycle: (tag: string) => void;
	onDepthRangeChange: (minDepth: number, maxDepth: number) => void;
	onSortChange: (sort: ExplorerSort) => void;
	onViewChange: (view: TaskConfig['view']) => void;
	onColumnsChange: (columns: TaskConfig['columns']) => void;
	onExpandedToggle: () => void;
	onTagFilterResizeStart: (event: PointerEvent<HTMLButtonElement>) => void;
	onTagFilterResizeMove: (event: PointerEvent<HTMLButtonElement>) => void;
	onTagFilterResizeEnd: (event: PointerEvent<HTMLButtonElement>) => void;
}
