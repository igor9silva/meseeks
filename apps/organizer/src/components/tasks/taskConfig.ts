import type { ExplorerQueryInput, ExplorerRouteSearch, ExplorerSort } from '~/lib/explorerSearchParams';
import type { TaskConfig } from '~/server/taskIndexSchemas';

export interface TaskConfigPatch {
	view?: TaskConfig['view'];
	columns?: TaskConfig['columns'];
	minDepth?: number;
	maxDepth?: number;
	sort?: ExplorerSort;
	panelSizes?: Partial<TaskConfig['panelSizes']>;
	panels?: Partial<TaskConfig['panels']>;
}

export function createGlobalTaskConfig(): TaskConfig {
	//
	return {
		view: 'list',
		scope: 'direct',
		columns: [],
		minDepth: 1,
		maxDepth: 1,
		sort: 'priority_then_recency',
		panelSizes: {
			current: 24,
			selected: 30,
			tagFilters: 128,
		},
		panels: {
			currentCollapsed: false,
		},
	};
}

export function mergeTaskConfig(config: TaskConfig, patch: TaskConfigPatch): TaskConfig {
	//
	const panelSizes = {
		current:
			patch.panelSizes?.current === undefined
				? config.panelSizes.current
				: clampNumber(patch.panelSizes.current, 10, 80),
		selected:
			patch.panelSizes?.selected === undefined
				? config.panelSizes.selected
				: clampNumber(patch.panelSizes.selected, 10, 80),
		tagFilters:
			patch.panelSizes?.tagFilters === undefined
				? config.panelSizes.tagFilters
				: clampNumber(Math.round(patch.panelSizes.tagFilters), 42, 320),
	};
	const minDepth = patch.minDepth ?? config.minDepth;
	const maxDepth = patch.maxDepth ?? config.maxDepth;
	const panels = {
		currentCollapsed: patch.panels?.currentCollapsed ?? config.panels.currentCollapsed,
	};

	return {
		...config,
		view: patch.view ?? config.view,
		columns: patch.columns ?? config.columns,
		minDepth: Math.min(minDepth, maxDepth),
		maxDepth: Math.max(minDepth, maxDepth),
		sort: patch.sort ?? config.sort,
		panelSizes,
		panels,
	};
}

export function applyConfigDefaults(
	queryInput: ExplorerQueryInput,
	search: ExplorerRouteSearch,
	config: TaskConfig | null,
): ExplorerQueryInput {
	//
	if (config === null) return queryInput;

	const minDepth =
		search.minDepth === undefined && search.depth === undefined ? config.minDepth : queryInput.minDepth;
	const maxDepth =
		search.maxDepth === undefined && search.depth === undefined ? config.maxDepth : queryInput.maxDepth;
	const sort = search.sort === undefined ? config.sort : queryInput.sort;

	return {
		...queryInput,
		minDepth,
		maxDepth,
		sort,
	};
}

export function areTaskConfigsEqual(left: TaskConfig, right: TaskConfig): boolean {
	//
	return JSON.stringify(left) === JSON.stringify(right);
}

export function getSubtasksPanelSize(
	config: TaskConfig,
	shouldShowCurrentPanel: boolean,
	shouldShowInspector: boolean,
): number {
	//
	const currentSize = shouldShowCurrentPanel ? config.panelSizes.current : 0;
	const selectedSize = shouldShowInspector ? config.panelSizes.selected : 0;
	return clampNumber(100 - currentSize - selectedSize, 30, 100);
}

function clampNumber(value: number, min: number, max: number): number {
	//
	if (value < min) return min;
	if (value > max) return max;
	return value;
}
