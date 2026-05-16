import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@reactor/ui/resizable';
import { useResizablePanelGroup } from '@reactor/ui/hooks/useResizablePanelGroup';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CreateTaskView } from '~/components/tasks/CreateTaskView';
import { TaskBoard } from '~/components/tasks/TaskBoard';
import { TaskDetailView } from '~/components/tasks/TaskDetailView';
import {
	type ExplorerQueryInput,
	type ExplorerRouteSearch,
	type ExplorerSort,
	parseExplorerQuery,
	serializeCsv,
	type TaskSource,
} from '~/lib/explorerSearchParams';
import { getExplorerSnapshot, getTaskDetail } from '~/server/taskExplorer';
import type { CreateTaskDefaults, ExplorerSnapshotResult, TaskCreatedResult, TaskDetailResult } from './taskExplorerTypes';
import { dedupeStrings, defaultStatusOptions, getCreateTaskDefaults, SEARCH_DEBOUNCE_MS } from './taskExplorerUtils';

const DEFAULT_BOARD_WIDTH_PERCENT = 66;
const EXPANDED_DETAIL_BOARD_WIDTH_PERCENT = 35;

export function TaskExplorerPage({
	search,
	initialSnapshot,
	initialTaskDetail,
	initialTaskDetailKey,
}: {
	search: ExplorerRouteSearch;
	initialSnapshot?: ExplorerSnapshotResult;
	initialTaskDetail?: TaskDetailResult | null;
	initialTaskDetailKey?: string | null;
}) {
	//
	const navigate = useNavigate({ from: '/' });
	const searchInputId = useId();
	const queryInput = useMemo(() => parseExplorerQuery(search), [search]);
	const selectedTaskKey = search.taskKey ?? null;
	const isInspectorExpanded = search.detail === 'expanded';
	const [searchDraft, setSearchDraft] = useState(queryInput.q);
	const [createTaskDefaults, setCreateTaskDefaults] = useState<CreateTaskDefaults | null>(null);
	const [boardWidthPercent, setBoardWidthPercent] = useState(() =>
		isInspectorExpanded ? EXPANDED_DETAIL_BOARD_WIDTH_PERCENT : DEFAULT_BOARD_WIDTH_PERCENT,
	);
	const lastCommittedSearchRef = useRef(queryInput.q);
	const getExplorerSnapshotServer = useServerFn(getExplorerSnapshot);
	const getTaskDetailServer = useServerFn(getTaskDetail);
	const isCreatingTask = createTaskDefaults !== null;
	const getBoardWidthPercent = useCallback(() => boardWidthPercent, [boardWidthPercent]);
	const { getPanelSize, handleDragging, handleLayout } = useResizablePanelGroup({
		getValue: getBoardWidthPercent,
		setValue: setBoardWidthPercent,
		defaultValue: DEFAULT_BOARD_WIDTH_PERCENT,
	});

	const explorerQuery = useQuery({
		queryKey: ['tasks-explorer', queryInput],
		queryFn: () => getExplorerSnapshotServer({ data: queryInput }),
		initialData: initialSnapshot,
		placeholderData: (previousData) => previousData,
		refetchInterval: 2000,
	});

	const routeTaskDetail =
		selectedTaskKey !== null && initialTaskDetailKey === selectedTaskKey ? (initialTaskDetail ?? undefined) : undefined;
	const taskDetailQuery = useQuery({
		queryKey: ['task-detail', selectedTaskKey],
		enabled: Boolean(selectedTaskKey) && !isCreatingTask,
		queryFn: () => {
			if (!selectedTaskKey) throw new Error('missing task key');
			return getTaskDetailServer({ data: { taskKey: selectedTaskKey } });
		},
		initialData: routeTaskDetail,
		refetchInterval: 2000,
	});
	const taskDetailData = taskDetailQuery.data ?? routeTaskDetail;
	const isTaskDetailPending = routeTaskDetail === undefined && taskDetailQuery.isPending;

	const updateSearch = useCallback(
		(partial: Partial<ExplorerRouteSearch>) => {
			navigate({
				search: (previous) => ({
					...previous,
					...partial,
				}),
				replace: false,
			});
		},
		[navigate],
	);

	const updateQueryInput = useCallback(
		(nextQuery: ExplorerQueryInput) => {
			updateSearch({
				q: nextQuery.q.length > 0 ? nextQuery.q : undefined,
				sources: nextQuery.sources.length > 0 ? serializeCsv(nextQuery.sources) : '',
				statuses: nextQuery.statuses.length > 0 ? serializeCsv(nextQuery.statuses) : '',
				tags: serializeCsv(nextQuery.tags),
				excludedTags: serializeCsv(nextQuery.excludedTags),
				rootsOnly: nextQuery.rootsOnly ? 'true' : undefined,
				sort: nextQuery.sort,
			});
		},
		[updateSearch],
	);

	useEffect(() => {
		if (queryInput.q === lastCommittedSearchRef.current) return;
		setSearchDraft(queryInput.q);
		lastCommittedSearchRef.current = queryInput.q;
	}, [queryInput.q]);

	useEffect(() => {
		const debounceHandle = setTimeout(() => {
			if (searchDraft === queryInput.q) return;
			lastCommittedSearchRef.current = searchDraft;
			updateSearch({
				q: searchDraft.length > 0 ? searchDraft : undefined,
			});
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			clearTimeout(debounceHandle);
		};
	}, [searchDraft, queryInput.q, updateSearch]);

	useEffect(() => {
		const appTitle = 'Organizer';

		if (isCreatingTask) {
			document.title = 'New task';
			return;
		}

		if (!selectedTaskKey) {
			document.title = appTitle;
			return;
		}

		const selectedTitle = taskDetailData?.task?.title;
		if (!selectedTitle) {
			document.title = appTitle;
			return;
		}

		document.title = selectedTitle;
	}, [isCreatingTask, selectedTaskKey, taskDetailData?.task?.title]);

	useEffect(() => {
		if (selectedTaskKey === null) return;
		setCreateTaskDefaults(null);
	}, [selectedTaskKey]);

	useEffect(() => {
		setBoardWidthPercent(isInspectorExpanded ? EXPANDED_DETAIL_BOARD_WIDTH_PERCENT : DEFAULT_BOARD_WIDTH_PERCENT);
	}, [isInspectorExpanded]);

	const health = explorerQuery.data?.health;
	const shouldShowIndexUnavailable = explorerQuery.isFetched && health !== undefined && !health.isReady;
	const visibleTasks = explorerQuery.data?.tasks ?? [];
	const facets = explorerQuery.data?.facets;
	const statusOptions = useMemo(() => {
		const indexedStatuses = explorerQuery.data?.statusOptions ?? [];
		return dedupeStrings(defaultStatusOptions.concat(queryInput.statuses, indexedStatuses));
	}, [explorerQuery.data?.statusOptions, queryInput.statuses]);
	const shouldShowTaskNotFound =
		!isCreatingTask && selectedTaskKey !== null && !isTaskDetailPending && taskDetailData?.task === null;

	const toggleSource = (source: TaskSource) => {
		const hasSource = queryInput.sources.includes(source);
		const nextSources = hasSource
			? queryInput.sources.filter((entry) => entry !== source)
			: queryInput.sources.concat(source);

		updateQueryInput({ ...queryInput, sources: nextSources });
	};

	const toggleStatus = (status: string) => {
		const hasStatus = queryInput.statuses.includes(status);
		const nextStatuses = hasStatus
			? queryInput.statuses.filter((entry) => entry !== status)
			: queryInput.statuses.concat(status);

		updateQueryInput({ ...queryInput, statuses: nextStatuses });
	};

	const cycleTagFilter = (tag: string) => {
		const isIncluded = queryInput.tags.includes(tag);
		const isExcluded = queryInput.excludedTags.includes(tag);

		if (isIncluded) {
			const nextExcludedTags = isExcluded ? queryInput.excludedTags : queryInput.excludedTags.concat(tag);

			updateQueryInput({
				...queryInput,
				tags: queryInput.tags.filter((entry) => entry !== tag),
				excludedTags: nextExcludedTags,
			});
			return;
		}

		if (isExcluded) {
			updateQueryInput({
				...queryInput,
				excludedTags: queryInput.excludedTags.filter((entry) => entry !== tag),
			});
			return;
		}

		updateQueryInput({
			...queryInput,
			tags: queryInput.tags.concat(tag),
		});
	};

	const toggleRootsOnly = () => {
		updateQueryInput({
			...queryInput,
			rootsOnly: !queryInput.rootsOnly,
		});
	};

	const updateSort = (sort: ExplorerSort) => {
		updateQueryInput({
			...queryInput,
			sort,
		});
	};

	const handleCreateTaskOpen = () => {
		setCreateTaskDefaults(getCreateTaskDefaults());
		if (selectedTaskKey !== null) {
			updateSearch({ taskKey: undefined });
		}
	};

	const handleTaskCreated = (result: TaskCreatedResult) => {
		const nextSources = queryInput.sources.includes(result.taskSource)
			? queryInput.sources
			: queryInput.sources.concat(result.taskSource);
		const nextStatuses = queryInput.statuses.includes(result.status)
			? queryInput.statuses
			: queryInput.statuses.concat(result.status);

		setCreateTaskDefaults(null);
		updateSearch({
			sources: serializeCsv(nextSources),
			statuses: serializeCsv(nextStatuses),
			taskKey: result.taskKey,
		});
	};
	const toggleInspectorExpanded = () => {
		const nextIsExpanded = !isInspectorExpanded;
		setBoardWidthPercent(nextIsExpanded ? EXPANDED_DETAIL_BOARD_WIDTH_PERCENT : DEFAULT_BOARD_WIDTH_PERCENT);
		updateSearch({ detail: nextIsExpanded ? 'expanded' : undefined });
	};
	const shouldShowInspector = isCreatingTask || selectedTaskKey !== null;
	const shouldShowExpandedInspector = shouldShowInspector && isInspectorExpanded;
	const preferredBoardWidthPercent = getPanelSize() ?? DEFAULT_BOARD_WIDTH_PERCENT;
	const taskBoard = (
		<TaskBoard
			className="h-full"
			queryInput={queryInput}
			searchDraft={searchDraft}
			selectedTaskKey={selectedTaskKey}
			shouldShowIndexUnavailable={shouldShowIndexUnavailable}
			health={health}
			visibleTasks={visibleTasks}
			facets={facets}
			totals={explorerQuery.data?.totals}
			isPending={explorerQuery.isPending}
			searchInputId={searchInputId}
			onSearchDraftChange={setSearchDraft}
			onCreateTaskOpen={handleCreateTaskOpen}
			onSourceToggle={toggleSource}
			onStatusToggle={toggleStatus}
			onTagFilterCycle={cycleTagFilter}
			onRootsOnlyToggle={toggleRootsOnly}
			onSortChange={updateSort}
			onTaskSelect={() => setCreateTaskDefaults(null)}
		/>
	);
	const inspectorPanel = shouldShowInspector ? (
		<section className="flex h-full min-h-0 flex-col overflow-hidden border border-border/80 bg-card">
			{createTaskDefaults !== null && (
				<CreateTaskView
					defaults={createTaskDefaults}
					statusOptions={statusOptions}
					onCancel={() => setCreateTaskDefaults(null)}
					onTaskCreated={handleTaskCreated}
				/>
			)}

			{!isCreatingTask && selectedTaskKey !== null && isTaskDetailPending && (
				<div className="p-4 text-sm text-muted-foreground">Loading task detail...</div>
			)}

			{shouldShowTaskNotFound && (
				<div className="p-4 text-sm text-muted-foreground">Task not found in generated indexes.</div>
			)}

			{!isCreatingTask && taskDetailData?.task && (
				<TaskDetailView
					detail={taskDetailData}
					isInspectorExpanded={isInspectorExpanded}
					statusOptions={statusOptions}
					tagOptions={explorerQuery.data?.tagOptions ?? []}
					onInspectorExpandedToggle={toggleInspectorExpanded}
					onNavigateTask={(taskKey) => updateSearch({ taskKey })}
					onTaskMoved={(newTaskKey, status) => {
						updateSearch({
							taskKey: queryInput.statuses.includes(status) ? newTaskKey : undefined,
						});
					}}
					onTaskSourceChanged={(newTaskKey, taskSource) => {
						const nextSources = queryInput.sources.includes(taskSource)
							? queryInput.sources
							: queryInput.sources.concat(taskSource);

						updateSearch({
							sources: serializeCsv(nextSources),
							taskKey: newTaskKey,
						});
					}}
					onTaskRenamed={(newTaskKey) => updateSearch({ taskKey: newTaskKey })}
					onTaskCompleted={(newTaskKey) => {
						updateSearch({
							taskKey: queryInput.statuses.includes('completed') ? newTaskKey : undefined,
						});
					}}
					onTaskTrashed={() => updateSearch({ taskKey: undefined })}
				/>
			)}
		</section>
	) : null;

	return (
		<div className="h-screen bg-background p-3 text-foreground">
			{shouldShowExpandedInspector ? (
				inspectorPanel
			) : shouldShowInspector ? (
				<ResizablePanelGroup
					key={isInspectorExpanded ? 'organizer-expanded-detail' : 'organizer-default-detail'}
					direction="horizontal"
					onLayout={handleLayout}
					className="h-full min-h-0 overflow-hidden"
				>
					<ResizablePanel
						key="organizer-board-panel"
						id="organizer-board"
						order={0}
						defaultSize={preferredBoardWidthPercent}
						minSize={35}
						className="min-w-0"
					>
						{taskBoard}
					</ResizablePanel>
					<ResizableHandle
						onDragging={handleDragging}
						className="bg-border/70 before:!w-2 after:!w-px after:bg-border hover:after:bg-foreground/50 data-[dragging=true]:after:bg-foreground/70"
					/>
					<ResizablePanel
						key="organizer-detail-panel"
						id="organizer-detail"
						order={1}
						defaultSize={100 - preferredBoardWidthPercent}
						minSize={25}
						className="min-w-0"
					>
						{inspectorPanel}
					</ResizablePanel>
				</ResizablePanelGroup>
			) : (
				taskBoard
			)}
		</div>
	);
}
