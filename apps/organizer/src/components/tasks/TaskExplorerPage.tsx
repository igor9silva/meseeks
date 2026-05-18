import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { usePrivateTaskBlur } from '~/components/tasks/OrganizerHeader';
import { TaskBoard } from '~/components/tasks/TaskBoard';
import { TaskExplorerWorkspace } from '~/components/tasks/TaskExplorerWorkspace';
import { useTaskExplorerConfig } from '~/components/tasks/useTaskExplorerConfig';
import { useTaskExplorerPanelLayout } from '~/components/tasks/useTaskExplorerPanelLayout';
import { useTaskExplorerSearchDraft } from '~/components/tasks/useTaskExplorerSearchDraft';
import { useTaskExplorerTitle } from '~/components/tasks/useTaskExplorerTitle';
import {
	type ExplorerQueryInput,
	type ExplorerRouteSearch,
	type ExplorerSort,
	parseExplorerQuery,
	serializeCsv,
	type TaskSource,
} from '~/lib/explorerSearchParams';
import { getExplorerSnapshot, getTaskByPath, getTaskDetail } from '~/server/taskExplorer';
import { RootCurrentPanel } from './root/RootCurrentPanel';
import { CurrentTaskPanel } from './panels/CurrentTaskPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import {
	applyConfigDefaults,
	createGlobalTaskConfig,
} from './taskConfig';
import type { CreateTaskDefaults, TaskDetailResult } from './taskExplorerTypes';
import {
	type ExpandedPanel,
	createTaskKey,
	getExplorerParentKey,
	getSelectedTaskKey,
	getSelectedValue,
	getTaskRoutePath,
	hasExplicitExpandedPanel,
	parseExpandedPanel,
	parseRoutePath,
	parseTaskKey,
} from './taskExplorerRouting';
import { getCreateTaskDefaults } from './taskExplorerUtils';

export function TaskExplorerPage({ search, routePath }: { search: ExplorerRouteSearch; routePath: string }) {
	//
	const navigate = useNavigate();
	const searchInputId = useId();
	const { currentSource, currentPath } = useMemo(() => parseRoutePath(routePath), [routePath]);
	const currentTaskKey = currentSource === null ? null : createTaskKey(currentSource, currentPath);
	const selectedTaskKey = getSelectedTaskKey(search, currentSource, currentPath);
	const explorerParentKey = getExplorerParentKey(currentTaskKey);
	const activeConfigKey = currentTaskKey ?? '/';
	const baseQueryInput = useMemo(() => parseExplorerQuery(search, explorerParentKey), [explorerParentKey, search]);
	const routeExpandedPanel = parseExpandedPanel(search);
	const hasExpandedSearch = hasExplicitExpandedPanel(search);
	const [createTaskDefaults, setCreateTaskDefaults] = useState<CreateTaskDefaults | null>(null);
	const defaultGlobalConfig = useMemo(() => createGlobalTaskConfig(), []);
	const { shouldBlurPrivateTasks, togglePrivateBlur } = usePrivateTaskBlur();
	const getExplorerSnapshotServer = useServerFn(getExplorerSnapshot);
	const getTaskByPathServer = useServerFn(getTaskByPath);
	const getTaskDetailServer = useServerFn(getTaskDetail);
	const isCreatingTask = createTaskDefaults !== null;

	const currentTaskQuery = useQuery({
		queryKey: ['task-current', currentSource, currentPath],
		enabled: currentSource !== null,
		queryFn: () => {
			if (currentSource === null) throw new Error('missing task source');
			return getTaskByPathServer({ data: { taskSource: currentSource, taskPath: currentPath } });
		},
		refetchInterval: 2000,
	});
	const currentTaskData: TaskDetailResult | undefined = currentTaskQuery.data;
	const currentTask = currentTaskData?.task ?? null;
	const { activeConfig, persistTaskConfigPatch } = useTaskExplorerConfig({
		activeConfigKey,
		currentTaskConfig: currentTask?.config,
		defaultGlobalConfig,
	});
	const activeCurrentTask =
		currentTask !== null
			? {
					...currentTask,
					config: activeConfig,
				}
			: currentTask;
	const queryInput = useMemo(
		() => applyConfigDefaults(baseQueryInput, search, activeConfig),
		[activeConfig, baseQueryInput, search],
	);

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
	const taskDetailData = taskDetailQuery.data;
	const isTaskDetailPending = selectedTaskKey !== null && taskDetailQuery.isPending;

	const updateSearch = useCallback(
		(partial: Partial<ExplorerRouteSearch>, options: { replace?: boolean } = {}) => {
			navigate({
				to: '.',
				search: {
					...search,
					...partial,
				},
				replace: options.replace ?? false,
			});
		},
		[navigate, search],
	);

	const updateQueryInput = useCallback(
		(nextQuery: ExplorerQueryInput) => {
			updateSearch(
				{
					q: nextQuery.q.length > 0 ? nextQuery.q : undefined,
					sources: undefined,
					tags: serializeCsv(nextQuery.tags),
					excludedTags: serializeCsv(nextQuery.excludedTags) ?? '',
					depth: undefined,
					minDepth: undefined,
					maxDepth: undefined,
					sort: undefined,
				},
				{ replace: true },
			);
		},
		[updateSearch],
	);
	const { searchDraft, setSearchDraft } = useTaskExplorerSearchDraft({ queryInput, updateSearch });

	useTaskExplorerTitle({
		currentTitle: currentTask?.title,
		detailTitle: taskDetailData?.task?.title,
		isCreatingTask,
	});

	useEffect(() => {
		if (selectedTaskKey === null) return;
		setCreateTaskDefaults(null);
	}, [selectedTaskKey]);

	const health = explorerQuery.data?.health;
	const shouldShowIndexUnavailable = explorerQuery.isFetched && health !== undefined && !health.isReady;
	const visibleTasks = explorerQuery.data?.tasks ?? [];
	const shouldShowTaskNotFound =
		!isCreatingTask && selectedTaskKey !== null && !isTaskDetailPending && taskDetailData?.task === null;

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

	const updateSort = (sort: ExplorerSort) => {
		persistTaskConfigPatch({
			sort,
		});
		updateSearch(
			{ depth: undefined, minDepth: undefined, maxDepth: undefined, sort: undefined },
			{ replace: true },
		);
	};

	const updateDepthRange = (minDepth: number, maxDepth: number) => {
		persistTaskConfigPatch({
			minDepth,
			maxDepth,
		});
		updateSearch(
			{ depth: undefined, minDepth: undefined, maxDepth: undefined, sort: undefined },
			{ replace: true },
		);
	};

	const handleCreateTaskOpen = () => {
		if (currentSource !== null) {
			const nextStatus = currentPath === 'tasks' || currentPath.startsWith('tasks/') ? 'backlog' : null;
			setCreateTaskDefaults({
				parentPath: currentPath.length > 0 ? currentPath : 'inbox',
				status: nextStatus,
				taskSource: currentSource,
			});
		} else {
			setCreateTaskDefaults(getCreateTaskDefaults());
		}

		if (selectedTaskKey !== null) {
			updateSearch({ selected: undefined });
		}
	};

	const navigateToTask = useCallback(
		(task: { taskSource: TaskSource; taskPath: string }) => {
			const nextRoutePath = getTaskRoutePath(task);
			if (nextRoutePath === '/') {
				navigate({ to: '/', search: {} });
				return;
			}

			navigate({
				to: '/$',
				params: {
					_splat: nextRoutePath.replace(/^\/+/, ''),
				},
				search: {},
			});
		},
		[navigate],
	);

	const handleTaskCreated = (result: { taskKey: string; taskPath: string; taskSource: TaskSource }) => {
		setCreateTaskDefaults(null);
		const isCurrentTaskParent =
			currentPath.length === 0 ||
			result.taskPath === currentPath ||
			result.taskPath.startsWith(`${currentPath.replace(/\/+$/g, '')}/`);

		if (currentSource === result.taskSource && isCurrentTaskParent) {
			const prefix = currentPath.length === 0 ? '' : `${currentPath.replace(/\/+$/g, '')}/`;
			const selected = prefix.length === 0 ? result.taskPath : result.taskPath.slice(prefix.length);

			updateSearch({
				selected,
			});
			return;
		}

		navigateToTask(result);
	};

	const toggleExpandedPanel = (panel: ExpandedPanel) => {
		const nextExpandedPanel = expandedPanel === panel ? 'none' : panel;

		updateSearch({
			detail: undefined,
			expanded: nextExpandedPanel,
		});
	};

	const shouldShowInspector = isCreatingTask || selectedTaskKey !== null;
	const { handlePanelDragging, handlePanelLayout } = useTaskExplorerPanelLayout({
		activeConfig,
		shouldShowInspector,
		persistTaskConfigPatch,
	});
	const hasNoDirectChildren =
		currentSource !== null && !explorerQuery.isPending && (explorerQuery.data?.totals.directChildren ?? 1) === 0;
	const expandedPanel =
		routeExpandedPanel ??
		(!hasExpandedSearch && hasNoDirectChildren && !shouldShowInspector && !isCreatingTask ? 'current' : null);
	const isInspectorExpanded = expandedPanel === 'selected';
	const isCurrentPanelCollapsed = activeConfig.panels.currentCollapsed;
	const shouldShowCurrentPanel = !isCurrentPanelCollapsed;
	const shouldShowCurrentPanelRail = isCurrentPanelCollapsed && expandedPanel === null;

	const handleCurrentPanelCollapse = () => {
		persistTaskConfigPatch({
			panels: {
				currentCollapsed: true,
			},
		});

		if (expandedPanel !== 'current') return;
		updateSearch({ detail: undefined, expanded: 'none' }, { replace: true });
	};

	const handleCurrentPanelExpand = () => {
		persistTaskConfigPatch({
			panels: {
				currentCollapsed: false,
			},
		});
	};

	useEffect(() => {
		if (expandedPanel === null) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			const shouldDisableAutoExpand =
				expandedPanel === 'current' && hasNoDirectChildren && !shouldShowInspector && !isCreatingTask;

			updateSearch(
				{
					detail: undefined,
					expanded: routeExpandedPanel === null || shouldDisableAutoExpand ? 'none' : undefined,
				},
				{ replace: true },
			);
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [expandedPanel, hasNoDirectChildren, isCreatingTask, routeExpandedPanel, shouldShowInspector, updateSearch]);

	const handleNavigateToTaskKey = (newTaskKey: string) => {
		const parsedTaskKey = parseTaskKey(newTaskKey);
		if (parsedTaskKey) navigateToTask(parsedTaskKey);
	};
	const currentPanel =
		currentSource === null ? (
			<RootCurrentPanel
				isExpanded={expandedPanel === 'current'}
				onCollapse={handleCurrentPanelCollapse}
				onExpandedToggle={() => toggleExpandedPanel('current')}
				/>
			) : (
				<CurrentTaskPanel
					state={{
						detail: currentTaskData,
						isPending: currentTaskQuery.isPending,
						isExpanded: expandedPanel === 'current',
						shouldBlurPrivateTasks,
						tagOptions: explorerQuery.data?.tagOptions ?? [],
					}}
					actions={{
						onPanelCollapse: handleCurrentPanelCollapse,
						onExpandedToggle: () => toggleExpandedPanel('current'),
						onTaskSourceChanged: (newTaskKey) => handleNavigateToTaskKey(newTaskKey),
						onTaskRenamed: (newTaskKey) => handleNavigateToTaskKey(newTaskKey),
						onTaskTrashed: () => {
							const parentPath = currentPath.split('/').slice(0, -1).join('/');
							navigateToTask({ taskSource: currentSource, taskPath: parentPath });
						},
					}}
				/>
			);
	const taskBoard = (
		<TaskBoard
			className="h-full"
			currentTask={activeCurrentTask}
			globalConfig={activeConfig}
			queryInput={queryInput}
			searchDraft={searchDraft}
			selectedTaskKey={selectedTaskKey}
			shouldShowIndexUnavailable={shouldShowIndexUnavailable}
			health={health}
			visibleTasks={visibleTasks}
			facets={explorerQuery.data?.facets}
			totals={explorerQuery.data?.totals}
			isPending={explorerQuery.isPending || (currentSource !== null && currentTaskQuery.isPending)}
			shouldBlurPrivateTasks={shouldBlurPrivateTasks}
			searchInputId={searchInputId}
			isExpanded={expandedPanel === 'subtasks'}
			onSearchDraftChange={setSearchDraft}
			onTagFilterCycle={cycleTagFilter}
			onDepthRangeChange={updateDepthRange}
			onSortChange={updateSort}
			onTagFiltersResize={(height) =>
				persistTaskConfigPatch({
					panelSizes: {
						tagFilters: height,
					},
				})
			}
			onTaskSelect={(task) => {
				setCreateTaskDefaults(null);
				if (task.key === selectedTaskKey) {
					updateSearch({ selected: undefined }, { replace: true });
					return;
				}

				updateSearch({ selected: getSelectedValue(task, currentSource, currentPath) }, { replace: true });
			}}
			onTaskOpen={navigateToTask}
			onViewChange={(view) => persistTaskConfigPatch({ view })}
			onColumnsChange={(columns) => persistTaskConfigPatch({ columns })}
			onExpandedToggle={() => toggleExpandedPanel('subtasks')}
		/>
	);
	const inspectorPanel = shouldShowInspector ? (
		<InspectorPanel
			state={{
				createTaskDefaults,
				selectedTaskKey,
				detail: taskDetailData,
				isDetailPending: isTaskDetailPending,
				isExpanded: isInspectorExpanded,
				shouldShowTaskNotFound,
				shouldBlurPrivateTasks,
				tagOptions: explorerQuery.data?.tagOptions ?? [],
			}}
			actions={{
				onCreateCancel: () => setCreateTaskDefaults(null),
				onTaskCreated: handleTaskCreated,
				onPanelExpand: isCurrentPanelCollapsed ? handleCurrentPanelExpand : undefined,
				onExpandedToggle: () => toggleExpandedPanel('selected'),
				onTaskSourceChanged: (newTaskKey) => updateSearch({ selected: newTaskKey }),
				onTaskRenamed: (newTaskKey) => updateSearch({ selected: newTaskKey }),
				onTaskTrashed: () => updateSearch({ selected: undefined }),
				onOpenTask: () => {
					if (!taskDetailData?.task) return;
					navigateToTask(taskDetailData.task);
				},
			}}
		/>
	) : null;
	const expandedContentByPanel = {
		current: currentPanel,
		subtasks: taskBoard,
		selected: inspectorPanel,
	};
	const expandedContent = expandedPanel === null ? null : (expandedContentByPanel[expandedPanel] ?? null);

	return (
		<TaskExplorerWorkspace
			model={{
				header: {
					currentSource,
					currentPath,
					currentTitle: currentTask?.title ?? null,
					shouldBlurPrivateTasks,
					onCreateTaskOpen: handleCreateTaskOpen,
					onPrivateBlurToggle: togglePrivateBlur,
				},
				layout: {
					activeConfig,
					currentPanel,
					taskBoard,
					inspectorPanel,
					expandedContent,
					shouldShowCurrentPanel,
					shouldShowCurrentPanelRail,
					shouldShowInspector,
					onCurrentPanelExpand: handleCurrentPanelExpand,
					onCurrentPanelExpandedToggle: () => toggleExpandedPanel('current'),
					onPanelDragging: handlePanelDragging,
					onPanelLayout: handlePanelLayout,
				},
			}}
		/>
	);
}
