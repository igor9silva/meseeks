import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@reactor/ui/resizable';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CreateTaskView } from '~/components/tasks/CreateTaskView';
import { OrganizerHeader, usePrivateTaskBlur } from '~/components/tasks/OrganizerHeader';
import { TaskBoard } from '~/components/tasks/TaskBoard';
import { TaskDetailView } from '~/components/tasks/TaskDetailView';
import { Mdx } from '~/components/ui/mdx';
import {
	type ExplorerQueryInput,
	type ExplorerRouteSearch,
	type ExplorerSort,
	ROOT_PARENT_KEY,
	parseExplorerQuery,
	serializeCsv,
	type TaskSource,
} from '~/lib/explorerSearchParams';
import { getExplorerSnapshot, getTaskByPath, getTaskDetail, updateTaskConfig } from '~/server/taskExplorer';
import type { TaskConfig } from '~/server/taskIndexSchemas';
import { getTaskReport, type TaskReport } from '~/server/taskReport';
import type { CreateTaskDefaults, ExplorerTask, TaskDetailResult } from './taskExplorerTypes';
import {
	formatSourceLabel,
	getCreateTaskDefaults,
	getTaskDisplayFilename,
	SEARCH_DEBOUNCE_MS,
} from './taskExplorerUtils';

type ExpandedPanel = 'current' | 'subtasks' | 'selected';

function parseRoutePath(routePath: string): { currentSource: TaskSource | null; currentPath: string } {
	//
	const normalizedPath = routePath.replace(/^\/+|\/+$/g, '');
	if (normalizedPath.length === 0) return { currentSource: null, currentPath: '' };

	const segments = normalizedPath.split('/');
	const firstSegment = segments[0];

	if (firstSegment !== 'public' && firstSegment !== 'private') {
		return { currentSource: null, currentPath: '' };
	}

	return {
		currentSource: firstSegment,
		currentPath: segments.slice(1).join('/'),
	};
}

function createTaskKey(taskSource: TaskSource, taskPath: string): string {
	//
	return `${taskSource}:${taskPath}`;
}

function getSelectedTaskKey(
	search: ExplorerRouteSearch,
	currentSource: TaskSource | null,
	currentPath: string,
): string | null {
	//
	if (!search.selected) return null;
	if (search.selected.includes(':')) return search.selected;

	if (currentSource === null) {
		return null;
	}

	const selectedPath =
		currentPath.length === 0 ? search.selected : `${currentPath.replace(/\/+$/g, '')}/${search.selected}`;

	return createTaskKey(currentSource, selectedPath.replace(/^\/+|\/+$/g, ''));
}

function getSelectedValue(task: ExplorerTask, currentSource: TaskSource | null, currentPath: string): string {
	//
	if (currentSource === null || task.taskSource !== currentSource) return task.key;
	if (currentPath.length === 0) return task.taskPath;

	const prefix = `${currentPath.replace(/\/+$/g, '')}/`;
	if (!task.taskPath.startsWith(prefix)) return task.taskPath;
	return task.taskPath.slice(prefix.length);
}

function parseExpandedPanel(search: ExplorerRouteSearch): ExpandedPanel | null {
	//
	if (search.expanded === 'current') return 'current';
	if (search.expanded === 'subtasks') return 'subtasks';
	if (search.expanded === 'selected') return 'selected';
	if (search.detail === 'expanded') return 'selected';

	return null;
}

function hasExplicitExpandedPanel(search: ExplorerRouteSearch): boolean {
	//
	return search.expanded !== undefined || search.detail === 'expanded';
}

function getTaskRoutePath(task: { taskSource: TaskSource; taskPath: string }): string {
	//
	if (task.taskPath.length === 0) return `/${task.taskSource}`;
	return `/${task.taskSource}/${task.taskPath}`;
}

function getDirectoryPath(filePath: string | null): string | null {
	//
	if (!filePath) return null;

	const normalizedPath = filePath.replaceAll('\\', '/');
	const lastSeparatorIndex = normalizedPath.lastIndexOf('/');
	if (lastSeparatorIndex <= 0) return null;

	return normalizedPath.slice(0, lastSeparatorIndex);
}

export function TaskExplorerPage({ search, routePath }: { search: ExplorerRouteSearch; routePath: string }) {
	//
	const navigate = useNavigate();
	const searchInputId = useId();
	const { currentSource, currentPath } = useMemo(() => parseRoutePath(routePath), [routePath]);
	const currentTaskKey = currentSource === null ? null : createTaskKey(currentSource, currentPath);
	const selectedTaskKey = getSelectedTaskKey(search, currentSource, currentPath);
	const explorerParentKey = currentSource === null ? ROOT_PARENT_KEY : currentTaskKey;
	const queryInput = useMemo(() => parseExplorerQuery(search, explorerParentKey), [explorerParentKey, search]);
	const routeExpandedPanel = parseExpandedPanel(search);
	const hasExpandedSearch = hasExplicitExpandedPanel(search);
	const [searchDraft, setSearchDraft] = useState(queryInput.q);
	const [createTaskDefaults, setCreateTaskDefaults] = useState<CreateTaskDefaults | null>(null);
	const [globalView, setGlobalView] = useState<TaskConfig['view']>('list');
	const [viewOverride, setViewOverride] = useState<{ taskKey: string | null; view: TaskConfig['view'] } | null>(null);
	const { shouldBlurPrivateTasks, togglePrivateBlur } = usePrivateTaskBlur();
	const lastCommittedSearchRef = useRef(queryInput.q);
	const queryClient = useQueryClient();
	const getExplorerSnapshotServer = useServerFn(getExplorerSnapshot);
	const getTaskByPathServer = useServerFn(getTaskByPath);
	const getTaskDetailServer = useServerFn(getTaskDetail);
	const getTaskReportServer = useServerFn(getTaskReport);
	const updateTaskConfigServer = useServerFn(updateTaskConfig);
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

	const explorerQuery = useQuery({
		queryKey: ['tasks-explorer', queryInput],
		queryFn: () => getExplorerSnapshotServer({ data: queryInput }),
		placeholderData: (previousData) => previousData,
		refetchInterval: 2000,
	});

	const reportQuery = useQuery({
		queryKey: ['task-report-mini'],
		enabled: currentSource === null,
		queryFn: () => getTaskReportServer({ data: {} }),
		refetchInterval: 5000,
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
					excludedTags: serializeCsv(nextQuery.excludedTags),
					depth: undefined,
					minDepth: nextQuery.minDepth === 1 ? undefined : String(nextQuery.minDepth),
					maxDepth: nextQuery.maxDepth === 1 ? undefined : String(nextQuery.maxDepth),
					sort: nextQuery.sort,
				},
				{ replace: true },
			);
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
			updateSearch(
				{
					q: searchDraft.length > 0 ? searchDraft : undefined,
				},
				{ replace: true },
			);
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

		if (taskDetailData?.task?.title) {
			document.title = taskDetailData.task.title;
			return;
		}

		if (currentTask?.title) {
			document.title = currentTask.title;
			return;
		}

		document.title = appTitle;
	}, [currentTask?.title, isCreatingTask, taskDetailData?.task?.title]);

	useEffect(() => {
		if (selectedTaskKey === null) return;
		setCreateTaskDefaults(null);
	}, [selectedTaskKey]);

	useEffect(() => {
		if (viewOverride === null) return;
		if (viewOverride.taskKey === null) return;
		if (currentTask?.key !== viewOverride.taskKey) return;
		if (currentTask.config.view !== viewOverride.view) return;

		setViewOverride(null);
	}, [currentTask?.config.view, currentTask?.key, viewOverride]);

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
		updateQueryInput({
			...queryInput,
			sort,
		});
	};

	const updateDepthRange = (minDepth: number, maxDepth: number) => {
		updateQueryInput({
			...queryInput,
			minDepth,
			maxDepth,
		});
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
		updateSearch({
			detail: undefined,
			expanded: routeExpandedPanel === panel ? undefined : panel,
		});
	};

	const updateCurrentTaskViewMutation = useMutation({
		mutationFn: (view: 'list' | 'board') => {
			if (!currentTask) throw new Error('missing current task');
			return updateTaskConfigServer({
				data: {
					taskKey: currentTask.key,
					config: {
						...currentTask.config,
						view,
					},
				},
			});
		},
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['task-current'] }),
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
			]);
		},
	});

	const shouldShowInspector = isCreatingTask || selectedTaskKey !== null;
	const hasNoDirectChildren =
		currentSource !== null && !explorerQuery.isPending && (explorerQuery.data?.totals.directChildren ?? 1) === 0;
	const expandedPanel =
		routeExpandedPanel ??
		(!hasExpandedSearch && hasNoDirectChildren && !shouldShowInspector && !isCreatingTask ? 'current' : null);
	const isInspectorExpanded = expandedPanel === 'selected';

	useEffect(() => {
		if (expandedPanel === null) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;

			updateSearch(
				{
					detail: undefined,
					expanded: routeExpandedPanel === null ? 'none' : undefined,
				},
				{ replace: true },
			);
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [expandedPanel, routeExpandedPanel, updateSearch]);
	const boardTask =
		currentTask !== null && viewOverride?.taskKey === currentTask.key
			? {
					...currentTask,
					config: {
						...currentTask.config,
						view: viewOverride.view,
					},
				}
			: currentTask;
	const boardGlobalView = viewOverride?.taskKey === null ? viewOverride.view : globalView;
	const currentPanel = (
		<TaskOverviewPanel
			currentSource={currentSource}
			currentPath={currentPath}
			currentTaskData={currentTaskData}
			isPending={currentSource !== null && currentTaskQuery.isPending}
			isExpanded={expandedPanel === 'current'}
			miniReport={reportQuery.data}
			isReportPending={currentSource === null && reportQuery.isPending}
			shouldBlurPrivateTasks={shouldBlurPrivateTasks}
			onExpandedToggle={() => toggleExpandedPanel('current')}
		/>
	);
	const taskBoard = (
		<TaskBoard
			className="h-full"
			currentTask={boardTask}
			globalView={boardGlobalView}
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
			onTaskSelect={(task) => {
				setCreateTaskDefaults(null);
				if (task.key === selectedTaskKey) {
					updateSearch({ selected: undefined }, { replace: true });
					return;
				}

				updateSearch({ selected: getSelectedValue(task, currentSource, currentPath) }, { replace: true });
			}}
			onTaskOpen={navigateToTask}
			onViewChange={(view) => {
				if (currentTask === null) {
					setGlobalView(view);
					setViewOverride({ taskKey: null, view });
					return;
				}

				setViewOverride({ taskKey: currentTask.key, view });
				updateCurrentTaskViewMutation.mutate(view, {
					onError: () => setViewOverride(null),
				});
			}}
			onExpandedToggle={() => toggleExpandedPanel('subtasks')}
		/>
	);
	const inspectorPanel = shouldShowInspector ? (
		<section className="flex h-full min-h-0 flex-col overflow-hidden border border-border/80 bg-card">
			{createTaskDefaults !== null && (
				<CreateTaskView
					defaults={createTaskDefaults}
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
					shouldBlurPrivateTasks={shouldBlurPrivateTasks}
					tagOptions={explorerQuery.data?.tagOptions ?? []}
					onInspectorExpandedToggle={() => toggleExpandedPanel('selected')}
					onTaskMoved={() => {
						queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] });
						queryClient.invalidateQueries({ queryKey: ['task-detail'] });
					}}
					onTaskSourceChanged={(newTaskKey) => updateSearch({ selected: newTaskKey })}
					onTaskRenamed={(newTaskKey) => updateSearch({ selected: newTaskKey })}
					onTaskCompleted={() => {
						updateSearch({ selected: undefined });
					}}
					onTaskTrashed={() => updateSearch({ selected: undefined })}
					onOpenTask={() => {
						if (!taskDetailData.task) return;
						navigateToTask(taskDetailData.task);
					}}
				/>
			)}
		</section>
	) : null;
	const expandedContentByPanel = {
		current: currentPanel,
		subtasks: taskBoard,
		selected: inspectorPanel,
	};
	const expandedContent = expandedPanel === null ? null : expandedContentByPanel[expandedPanel];

	return (
		<div className="flex h-screen flex-col bg-background text-foreground">
			<OrganizerHeader
				currentSource={currentSource}
				currentPath={currentPath}
				currentTitle={currentTask?.title ?? null}
				shouldBlurPrivateTasks={shouldBlurPrivateTasks}
				onCreateTaskOpen={handleCreateTaskOpen}
				onPrivateBlurToggle={togglePrivateBlur}
			/>
			<main className="min-h-0 flex-1 p-3">
				{expandedContent ? (
					expandedContent
				) : (
					<ResizablePanelGroup
						key={shouldShowInspector ? 'organizer-three-panel' : 'organizer-two-panel'}
						direction="horizontal"
						className="h-full min-h-0 overflow-hidden"
					>
						<ResizablePanel
							key="organizer-current-panel"
							id="organizer-current"
							order={0}
							defaultSize={24}
							minSize={16}
							className="min-w-0"
						>
							{currentPanel}
						</ResizablePanel>
						<OrganizerResizableHandle />
						<ResizablePanel
							key="organizer-subtasks-panel"
							id="organizer-subtasks"
							order={1}
							defaultSize={shouldShowInspector ? 46 : 76}
							minSize={30}
							className="min-w-0"
						>
							{taskBoard}
						</ResizablePanel>
						{shouldShowInspector ? (
							<>
								<OrganizerResizableHandle />
								<ResizablePanel
									key="organizer-selected-panel"
									id="organizer-selected"
									order={2}
									defaultSize={30}
									minSize={22}
									className="min-w-0"
								>
									{inspectorPanel}
								</ResizablePanel>
							</>
						) : null}
					</ResizablePanelGroup>
				)}
			</main>
		</div>
	);
}

function TaskOverviewPanel({
	currentSource,
	currentPath,
	currentTaskData,
	isPending,
	isExpanded,
	miniReport,
	isReportPending,
	shouldBlurPrivateTasks,
	onExpandedToggle,
}: {
	currentSource: TaskSource | null;
	currentPath: string;
	currentTaskData: TaskDetailResult | undefined;
	isPending: boolean;
	isExpanded: boolean;
	miniReport: TaskReport | undefined;
	isReportPending: boolean;
	shouldBlurPrivateTasks: boolean;
	onExpandedToggle: () => void;
}) {
	//
	const task = currentTaskData?.task ?? null;
	const shouldBlurTask = shouldBlurPrivateTasks && task?.taskSource === 'private';
	const privateBlurClassName = shouldBlurTask ? 'select-none blur-xs' : '';
	const title = task?.title ?? (currentSource === null ? 'Organizer' : formatSourceLabel(currentSource));
	const routePath = currentSource === null ? '/' : `/${currentSource}${currentPath ? `/${currentPath}` : ''}`;
	const assetBasePath = useMemo(() => getDirectoryPath(task?.absolutePath ?? null), [task?.absolutePath]);

	return (
		<section className="flex h-full min-h-0 flex-col overflow-hidden border border-border/80 bg-card text-foreground">
			<header className="flex items-start justify-between gap-3 border-b border-border/80 p-3">
				<div className="min-w-0">
					<h2 className={`break-words text-lg font-semibold ${privateBlurClassName}`}>{title}</h2>
					<div className="mt-1 break-all text-xs text-muted-foreground">{routePath}</div>
				</div>
				<button
					type="button"
					aria-label={isExpanded ? 'Collapse current task panel' : 'Expand current task panel'}
					title={isExpanded ? 'Collapse current task panel' : 'Expand current task panel'}
					onClick={onExpandedToggle}
					className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background text-foreground/80 hover:border-foreground/40 hover:text-foreground"
				>
					{isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
				</button>
			</header>

			<div className="min-h-0 flex-1 overflow-auto p-3">
				{currentSource === null ? <RootMiniReport report={miniReport} isPending={isReportPending} /> : null}

				{currentSource !== null && isPending ? (
					<div className="text-sm text-muted-foreground">Loading current task...</div>
				) : null}

				{currentSource !== null && !isPending && !task ? (
					<div className="text-sm text-muted-foreground">Current task not found in generated indexes.</div>
				) : null}

				{task ? (
					<div className="space-y-4">
						<div className={`space-y-2 text-sm ${privateBlurClassName}`}>
							<div>
								<div className="text-xs text-muted-foreground">File</div>
								<div className="break-all text-foreground/90">
									{getTaskDisplayFilename(task.relativePath)}
								</div>
							</div>
							<div className="flex flex-wrap gap-2 text-xs">
								<span className="rounded border border-border/80 px-1.5 py-0.5">
									{formatSourceLabel(task.taskSource)}
								</span>
								<span className="rounded border border-border/80 px-1.5 py-0.5">{task.section}</span>
								<span className="rounded border border-border/80 px-1.5 py-0.5">{task.status}</span>
								{task.priority ? (
									<span className="rounded border border-border/80 px-1.5 py-0.5">
										{task.priority}
									</span>
								) : null}
							</div>
						</div>

						{task.tags.length > 0 ? (
							<div className={`flex flex-wrap gap-1 ${privateBlurClassName}`}>
								{task.tags.map((tag) => (
									<span
										key={tag}
										className="rounded border border-border/80 bg-background px-1.5 py-0.5 text-xs"
									>
										#{tag}
									</span>
								))}
							</div>
						) : null}

						<div className={privateBlurClassName}>
							<Mdx text={task.body} className="text-sm" assetBasePath={assetBasePath} />
						</div>
					</div>
				) : null}
			</div>
		</section>
	);
}

function RootMiniReport({ report, isPending }: { report: TaskReport | undefined; isPending: boolean }) {
	//
	if (isPending && !report) {
		return <div className="text-sm text-muted-foreground">Loading report...</div>;
	}

	if (!report) {
		return <div className="text-sm text-muted-foreground">Report unavailable.</div>;
	}

	const inbox = findSectionReport(report, 'inbox');
	const actionable = findSectionReport(report, 'tasks');
	const references = findSectionReport(report, 'references');
	const ideas = findSectionReport(report, 'ideas');
	const active = findStatusReport(report, 'active');
	const backlog = findStatusReport(report, 'backlog');
	const completed = findStatusReport(report, 'completed');

	return (
		<div className="space-y-4 text-sm">
			<div className="space-y-2">
				<p className="text-muted-foreground">
					Everything starts here. Navigate into public or private, then keep drilling down.
				</p>
				<div className="flex flex-wrap gap-2">
					<a href="/report" className="rounded border border-border/80 px-2 py-1 text-xs hover:bg-accent">
						Full report
					</a>
					<a href="/tags" className="rounded border border-border/80 px-2 py-1 text-xs hover:bg-accent">
						Tags
					</a>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2">
				<RootMetric label="Public" value={report.totals.publicTasks} href="/public" />
				<RootMetric label="Private" value={report.totals.privateTasks} href="/private" />
				<RootSectionMetric label="Inbox" section="inbox" row={inbox} />
				<RootSectionMetric label="Tasks" section="tasks" row={actionable} />
				<RootSectionMetric label="References" section="references" row={references} />
				<RootSectionMetric label="Ideas" section="ideas" row={ideas} />
			</div>

			<div className="grid grid-cols-3 gap-2">
				<RootMetric label="Active" value={active.total} />
				<RootMetric label="Backlog" value={backlog.total} />
				<RootMetric label="Completed" value={completed.total} />
			</div>

			{report.totals.warnings > 0 ? (
				<div className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1.5 text-xs text-amber-100">
					{report.totals.warnings} index warnings need cleanup.
				</div>
			) : null}
		</div>
	);
}

function RootMetric({ label, value, href }: { label: string; value: number; href?: string }) {
	//
	const content = (
		<>
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="mt-1 text-xl font-semibold tabular-nums">{value.toLocaleString()}</div>
		</>
	);

	if (href) {
		return (
			<a href={href} className="rounded border border-border/80 bg-background px-2 py-1.5 hover:bg-accent">
				{content}
			</a>
		);
	}

	return <div className="rounded border border-border/80 bg-background px-2 py-1.5">{content}</div>;
}

function RootSectionMetric({
	label,
	section,
	row,
}: {
	label: string;
	section: string;
	row: ReturnType<typeof findSectionReport>;
}) {
	//
	const publicCount = Math.max(0, row.publicCount - 1);
	const privateCount = Math.max(0, row.privateCount - 1);
	const total = publicCount + privateCount;

	return (
		<div className="rounded border border-border/80 bg-background px-2 py-1.5">
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="mt-1 text-xl font-semibold tabular-nums">{total.toLocaleString()}</div>
			<div className="mt-2 flex flex-wrap gap-1 text-xs">
				<RootSectionLink href={`/public/${section}`} label="public" value={publicCount} />
				<RootSectionLink href={`/private/${section}`} label="private" value={privateCount} />
			</div>
		</div>
	);
}

function RootSectionLink({ href, label, value }: { href: string; label: string; value: number }) {
	//
	const content = `${label} ${value.toLocaleString()}`;

	if (value === 0) {
		return (
			<span className="rounded border border-border/60 px-1.5 py-0.5 text-muted-foreground/70">{content}</span>
		);
	}

	return (
		<a
			href={href}
			className="rounded border border-border/80 px-1.5 py-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
		>
			{content}
		</a>
	);
}

function findSectionReport(report: TaskReport, section: string) {
	//
	return (
		report.sections.find((row) => row.section === section) ?? {
			section,
			publicCount: 0,
			privateCount: 0,
			total: 0,
			rootCount: 0,
			childCount: 0,
			warningCount: 0,
		}
	);
}

function findStatusReport(report: TaskReport, status: string) {
	//
	return (
		report.statuses.find((row) => row.status === status) ?? {
			status,
			publicCount: 0,
			privateCount: 0,
			total: 0,
			rootCount: 0,
			childCount: 0,
		}
	);
}

function OrganizerResizableHandle() {
	//
	return (
		<ResizableHandle className="bg-border/70 before:!w-2 after:!w-px after:bg-border hover:after:bg-foreground/50 data-[dragging=true]:after:bg-foreground/70" />
	);
}
