import { cn } from '@reactor/ui';
import { type PointerEvent, useRef, useState } from 'react';
import type { ExplorerQueryInput, ExplorerSort } from '~/lib/explorerSearchParams';
import type { TaskConfig } from '~/server/taskIndexSchemas';
import { BoardView } from './board/BoardView';
import { ListView } from './board/ListView';
import {
	TaskBoardHeader,
	type TaskBoardHeaderActions,
	type TaskBoardHeaderState,
} from './board/TaskBoardHeader';
import { buildTagGroups } from './board/tagGroups';
import type { TaskListContext } from './board/taskListTypes';
import type { ExplorerFacets, ExplorerHealth, ExplorerTask, ExplorerTotals, TaskDetailTask } from './taskExplorerTypes';

const TAG_FILTER_MIN_HEIGHT = 42;
const TAG_FILTER_MAX_HEIGHT = 320;

interface TagFilterDrag {
	pointerId: number;
	startY: number;
	startHeight: number;
	nextHeight: number;
}

export function TaskBoard({
	className,
	currentTask,
	globalConfig,
	queryInput,
	searchDraft,
	selectedTaskKey,
	shouldShowIndexUnavailable,
	health,
	visibleTasks,
	facets,
	totals,
	isPending,
	shouldBlurPrivateTasks,
	searchInputId,
	isExpanded,
	onSearchDraftChange,
	onTagFilterCycle,
	onDepthRangeChange,
	onSortChange,
	onTagFiltersResize,
	onTaskSelect,
	onTaskOpen,
	onViewChange,
	onColumnsChange,
	onExpandedToggle,
}: {
	className?: string;
	currentTask: TaskDetailTask | null;
	globalConfig: TaskConfig;
	queryInput: ExplorerQueryInput;
	searchDraft: string;
	selectedTaskKey: string | null;
	shouldShowIndexUnavailable: boolean;
	health: ExplorerHealth | undefined;
	visibleTasks: ExplorerTask[];
	facets: ExplorerFacets | undefined;
	totals: ExplorerTotals | undefined;
	isPending: boolean;
	shouldBlurPrivateTasks: boolean;
	searchInputId: string;
	isExpanded: boolean;
	onSearchDraftChange: (value: string) => void;
	onTagFilterCycle: (tag: string) => void;
	onDepthRangeChange: (minDepth: number, maxDepth: number) => void;
	onSortChange: (sort: ExplorerSort) => void;
	onTagFiltersResize: (height: number) => void;
	onTaskSelect: (task: ExplorerTask) => void;
	onTaskOpen: (task: ExplorerTask) => void;
	onViewChange: (view: TaskConfig['view']) => void;
	onColumnsChange: (columns: TaskConfig['columns']) => void;
	onExpandedToggle: () => void;
}) {
	//
	const config = currentTask?.config ?? globalConfig;
	const tagFilterDragRef = useRef<TagFilterDrag | null>(null);
	const [tagFilterDraftHeight, setTagFilterDraftHeight] = useState<number | null>(null);
	const tagGroups = buildTagGroups(facets?.tagGroups ?? [], queryInput.tags.concat(queryInput.excludedTags));
	const shouldRenderBoard = config.view === 'board';
	const shouldShowViewTabs =
		config.view === 'board' || config.columns.length === 0 || visibleTasks.length > 0 || (totals?.all ?? 0) > 0;
	const tagFilterHeight = tagFilterDraftHeight ?? config.panelSizes.tagFilters;

	const taskList: TaskListContext = {
		selectedTaskKey,
		shouldBlurPrivateTasks,
		onTaskSelect,
		onTaskOpen,
	};
	const headerState: TaskBoardHeaderState = {
		config,
		queryInput,
		searchDraft,
		searchInputId,
		health,
		totals,
		tagGroups,
		tagFilterHeight,
		isTagFilterDragging: tagFilterDraftHeight !== null,
		isExpanded,
		shouldShowIndexUnavailable,
		shouldShowViewTabs,
	};
	const headerActions: TaskBoardHeaderActions = {
		onSearchDraftChange,
		onTagFilterCycle,
		onDepthRangeChange,
		onSortChange,
		onViewChange,
		onColumnsChange,
		onExpandedToggle,
		onTagFilterResizeStart: handleTagFilterResizeStart,
		onTagFilterResizeMove: handleTagFilterResizeMove,
		onTagFilterResizeEnd: handleTagFilterResizeEnd,
	};

	function handleTagFilterResizeStart(event: PointerEvent<HTMLButtonElement>) {
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		tagFilterDragRef.current = {
			pointerId: event.pointerId,
			startY: event.clientY,
			startHeight: tagFilterHeight,
			nextHeight: tagFilterHeight,
		};
		setTagFilterDraftHeight(tagFilterHeight);
	}

	function handleTagFilterResizeMove(event: PointerEvent<HTMLButtonElement>) {
		const drag = tagFilterDragRef.current;
		if (drag === null) return;
		if (drag.pointerId !== event.pointerId) return;

		const nextHeight = clampTagFilterHeight(drag.startHeight + event.clientY - drag.startY);
		drag.nextHeight = nextHeight;
		setTagFilterDraftHeight(nextHeight);
	}

	function handleTagFilterResizeEnd(event: PointerEvent<HTMLButtonElement>) {
		const drag = tagFilterDragRef.current;
		if (drag === null) return;
		if (drag.pointerId !== event.pointerId) return;

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		tagFilterDragRef.current = null;
		setTagFilterDraftHeight(null);
		onTagFiltersResize(drag.nextHeight);
	}

	return (
		<section
			className={cn(
				'flex min-h-0 flex-col overflow-hidden border border-border/80 bg-background text-foreground',
				className,
			)}
		>
			<TaskBoardHeader state={headerState} actions={headerActions} />
			<div className="min-h-0 flex-1 overflow-auto">
				{isPending ? <div className="px-3 py-4 text-sm text-muted-foreground">Loading tasks...</div> : null}
				{!isPending && visibleTasks.length === 0 ? (
					<div className="px-3 py-4 text-sm text-muted-foreground">
						{totals?.directChildren === 0 ? 'This task has no subtasks.' : 'No tasks match this view.'}
					</div>
				) : null}

				{shouldRenderBoard ? (
					<BoardView config={config} tasks={visibleTasks} taskList={taskList} />
				) : (
					<ListView tasks={visibleTasks} taskList={taskList} />
				)}
			</div>
		</section>
	);
}

function clampTagFilterHeight(height: number): number {
	//
	if (height < TAG_FILTER_MIN_HEIGHT) return TAG_FILTER_MIN_HEIGHT;
	if (height > TAG_FILTER_MAX_HEIGHT) return TAG_FILTER_MAX_HEIGHT;
	return Math.round(height);
}
