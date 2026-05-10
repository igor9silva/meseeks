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
	splitCsv,
	type TaskSource,
} from '~/lib/explorerSearchParams';
import { defaultVisibleTaskBuckets } from '~/lib/taskBuckets';
import { getExplorerSnapshot, getTaskDetail } from '~/server/taskExplorer';
import type { CreateTaskDefaults, TaskCreatedResult } from './taskExplorerTypes';
import { dedupeStrings, defaultStatusOptions, getCreateTaskDefaults, SEARCH_DEBOUNCE_MS } from './taskExplorerUtils';

export function TaskExplorerPage({ search }: { search: ExplorerRouteSearch }) {
	//
	const navigate = useNavigate({ from: '/' });
	const searchInputId = useId();
	const queryInput = useMemo(() => parseExplorerQuery(search), [search]);
	const selectedTaskKey = search.taskKey ?? null;
	const [searchDraft, setSearchDraft] = useState(queryInput.q);
	const [createTaskDefaults, setCreateTaskDefaults] = useState<CreateTaskDefaults | null>(null);
	const [boardWidthPercent, setBoardWidthPercent] = useState(66);
	const lastCommittedSearchRef = useRef(queryInput.q);
	const getExplorerSnapshotServer = useServerFn(getExplorerSnapshot);
	const getTaskDetailServer = useServerFn(getTaskDetail);
	const isCreatingTask = createTaskDefaults !== null;
	const getBoardWidthPercent = useCallback(() => boardWidthPercent, [boardWidthPercent]);
	const { getPanelSize, handleDragging, handleLayout } = useResizablePanelGroup({
		getValue: getBoardWidthPercent,
		setValue: setBoardWidthPercent,
		defaultValue: 66,
	});

	const explorerQuery = useQuery({
		queryKey: ['tasks-explorer', queryInput],
		queryFn: () => getExplorerSnapshotServer({ data: queryInput }),
		placeholderData: (previousData) => previousData,
		refetchInterval: 2000,
	});

	const taskDetailQuery = useQuery({
		queryKey: ['task-detail', selectedTaskKey],
		enabled: Boolean(selectedTaskKey) && !isCreatingTask,
		queryFn: () => {
			if (!selectedTaskKey) throw new Error('missing task key');
			return getTaskDetailServer({ data: { taskKey: selectedTaskKey } });
		},
		refetchInterval: 2000,
	});

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

		const selectedTitle = taskDetailQuery.data?.task?.title;
		if (!selectedTitle) {
			document.title = appTitle;
			return;
		}

		document.title = selectedTitle;
	}, [isCreatingTask, selectedTaskKey, taskDetailQuery.data?.task?.title]);

	useEffect(() => {
		if (selectedTaskKey === null) return;
		setCreateTaskDefaults(null);
	}, [selectedTaskKey]);

	const health = explorerQuery.data?.health;
	const shouldShowIndexUnavailable = explorerQuery.isFetched && health !== undefined && !health.isReady;
	const visibleTasks = explorerQuery.data?.tasks ?? [];
	const facets = explorerQuery.data?.facets;
	const statusOptions = useMemo(() => {
		const indexedStatuses = explorerQuery.data?.statusOptions ?? [];
		return dedupeStrings(defaultStatusOptions.concat(queryInput.statuses, indexedStatuses));
	}, [explorerQuery.data?.statusOptions, queryInput.statuses]);
	const visibleBoardStatuses = useMemo(() => {
		const parsedColumns = splitCsv(search.columns);
		if (parsedColumns.length === 0) return Array.from(defaultVisibleTaskBuckets);
		return parsedColumns;
	}, [search.columns]);
	const shouldShowTaskNotFound =
		!isCreatingTask &&
		selectedTaskKey !== null &&
		!taskDetailQuery.isPending &&
		taskDetailQuery.data?.task === null;

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

	const toggleTag = (tag: string) => {
		const hasTag = queryInput.tags.includes(tag);
		const nextTags = hasTag ? queryInput.tags.filter((entry) => entry !== tag) : queryInput.tags.concat(tag);
		const nextExcludedTags = hasTag
			? queryInput.excludedTags
			: queryInput.excludedTags.filter((entry) => entry !== tag);

		updateQueryInput({
			...queryInput,
			tags: nextTags,
			excludedTags: nextExcludedTags,
		});
	};

	const toggleExcludedTag = (tag: string) => {
		const hasExcludedTag = queryInput.excludedTags.includes(tag);
		const nextExcludedTags = hasExcludedTag
			? queryInput.excludedTags.filter((entry) => entry !== tag)
			: queryInput.excludedTags.concat(tag);
		const nextTags = hasExcludedTag ? queryInput.tags : queryInput.tags.filter((entry) => entry !== tag);

		updateQueryInput({
			...queryInput,
			tags: nextTags,
			excludedTags: nextExcludedTags,
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

	const toggleVisibleBoardStatus = (status: string) => {
		let nextStatuses: string[];

		if (visibleBoardStatuses.includes(status)) {
			if (visibleBoardStatuses.length === 1) return;
			nextStatuses = visibleBoardStatuses.filter((entry) => entry !== status);
		} else {
			nextStatuses = visibleBoardStatuses.concat(status);
		}

		updateSearch({
			columns: areStringArraysEqual(nextStatuses, defaultVisibleTaskBuckets)
				? undefined
				: serializeCsv(nextStatuses),
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
	const shouldShowInspector = isCreatingTask || selectedTaskKey !== null;
	const preferredBoardWidthPercent = getPanelSize() ?? 66;
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
			visibleBoardStatuses={visibleBoardStatuses}
			onSearchDraftChange={setSearchDraft}
			onCreateTaskOpen={handleCreateTaskOpen}
			onSourceToggle={toggleSource}
			onStatusToggle={toggleStatus}
			onTagToggle={toggleTag}
			onExcludedTagToggle={toggleExcludedTag}
			onRootsOnlyToggle={toggleRootsOnly}
			onSortChange={updateSort}
			onVisibleBoardStatusToggle={toggleVisibleBoardStatus}
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

			{!isCreatingTask && selectedTaskKey !== null && taskDetailQuery.isPending && (
				<div className="p-4 text-sm text-muted-foreground">Loading task detail...</div>
			)}

			{shouldShowTaskNotFound && (
				<div className="p-4 text-sm text-muted-foreground">Task not found in generated indexes.</div>
			)}

			{!isCreatingTask && taskDetailQuery.data?.task && (
				<TaskDetailView
					detail={taskDetailQuery.data}
					statusOptions={statusOptions}
					tagOptions={explorerQuery.data?.tagOptions ?? []}
					onNavigateTask={(taskKey) => updateSearch({ taskKey })}
					onTaskMoved={(newTaskKey, status) => {
						updateSearch({
							taskKey: queryInput.statuses.includes(status) ? newTaskKey : undefined,
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
			{shouldShowInspector ? (
				<ResizablePanelGroup
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

function areStringArraysEqual(left: string[], right: readonly string[]): boolean {
	//
	if (left.length !== right.length) return false;

	for (let index = 0; index < left.length; index += 1) {
		if (left[index] !== right[index]) return false;
	}

	return true;
}
