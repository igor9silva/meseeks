import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CreateTaskView } from '~/components/tasks/CreateTaskView';
import { TaskDetailView } from '~/components/tasks/TaskDetailView';
import { TaskExplorerSidebar } from '~/components/tasks/TaskExplorerSidebar';
import {
	type ExplorerQueryInput,
	type ExplorerRouteSearch,
	type ExplorerSort,
	parseExplorerQuery,
	serializeCsv,
	type TaskSource,
} from '~/lib/explorerSearchParams';
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
	const lastCommittedSearchRef = useRef(queryInput.q);
	const getExplorerSnapshotServer = useServerFn(getExplorerSnapshot);
	const getTaskDetailServer = useServerFn(getTaskDetail);
	const isCreatingTask = createTaskDefaults !== null;

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
				sources: serializeCsv(nextQuery.sources),
				statuses: serializeCsv(nextQuery.statuses),
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

	const handleCreateTaskOpen = () => {
		setCreateTaskDefaults(getCreateTaskDefaults(queryInput));
		updateSearch({ taskKey: undefined });
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

	return (
		<div
			className="h-screen bg-background p-3 text-foreground"
			style={{ backgroundColor: '#09090b', color: '#fafafa' }}
		>
			<div className="grid h-full gap-3 lg:grid-cols-[minmax(360px,460px)_1fr]">
				<TaskExplorerSidebar
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
					onTagToggle={toggleTag}
					onExcludedTagToggle={toggleExcludedTag}
					onRootsOnlyToggle={toggleRootsOnly}
					onSortChange={updateSort}
					onTaskSelect={() => setCreateTaskDefaults(null)}
				/>

				<section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
					{createTaskDefaults !== null && (
						<CreateTaskView
							defaults={createTaskDefaults}
							statusOptions={statusOptions}
							onCancel={() => setCreateTaskDefaults(null)}
							onTaskCreated={handleTaskCreated}
						/>
					)}

					{!isCreatingTask && selectedTaskKey === null && (
						<div className="p-4 text-sm text-muted-foreground">
							Select a task from the left list to inspect details.
						</div>
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
						/>
					)}
				</section>
			</div>
		</div>
	);
}
