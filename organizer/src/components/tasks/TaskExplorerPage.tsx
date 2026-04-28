import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { Check, ChevronDown, Lock, Plus, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Mdx } from '~/components/ui/mdx';
import { Textarea } from '~/components/ui/textarea';
import {
	type ExplorerQueryInput,
	type ExplorerRouteSearch,
	explorerSortSchema,
	parseExplorerQuery,
	serializeCsv,
	type TaskSource,
} from '~/lib/explorerSearchParams';
import { cn } from '~/lib/utils';
import {
	type CreateTaskInput,
	createTask,
	getExplorerSnapshot,
	getTaskDetail,
	markTaskDone,
	updateTaskTags,
} from '~/server/taskExplorer';

function formatSourceLabel(source: TaskSource): string {
	//
	return source === 'private' ? 'Private' : 'Public';
}

type TaskDetailResult = NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>;
type TaskDetailTask = NonNullable<TaskDetailResult['task']>;

function buildTaskPrompt(task: TaskDetailTask): string {
	//
	return task.body.trim();
}

function toCursorFileHref(absolutePath: string | null): string | null {
	//
	if (!absolutePath) return null;
	return `cursor://file${encodeURI(absolutePath)}`;
}

function toCursorTaskHref(task: TaskDetailTask): string {
	//
	const url = new URL('cursor://anysphere.cursor-deeplink/prompt');
	const prompt = buildTaskPrompt(task);

	url.searchParams.set('text', prompt);

	return url.toString();
}

function toCodexTaskHref(task: TaskDetailTask): string {
	//
	const url = new URL('codex://new');
	const prompt = buildTaskPrompt(task);

	url.searchParams.set('prompt', prompt);

	return url.toString();
}

type CreateTaskDefaults = Pick<CreateTaskInput, 'status' | 'taskSource'>;

const taskSourceOptions: TaskSource[] = ['public', 'private'];
const taskPriorityOptions: Array<CreateTaskInput['priority']> = ['critical', 'high', 'medium', 'low'];
const defaultStatusOptions = ['active', 'backlog', 'inbox'];
const SEARCH_DEBOUNCE_MS = 150;

function dedupeStrings(values: string[]): string[] {
	//
	const seen = new Set<string>();
	const output: string[] = [];

	for (const value of values) {
		const trimmedValue = value.trim();
		if (trimmedValue.length === 0) continue;
		if (seen.has(trimmedValue)) continue;
		seen.add(trimmedValue);
		output.push(trimmedValue);
	}

	return output;
}

function getCreateTaskDefaults(queryInput: ExplorerQueryInput): CreateTaskDefaults {
	//
	let taskSource: TaskSource = 'public';
	let status = 'backlog';

	if (queryInput.sources.length === 1) {
		const onlySource = queryInput.sources[0];
		if (onlySource) taskSource = onlySource;
	}

	if (queryInput.statuses.length === 1) {
		const onlyStatus = queryInput.statuses[0];
		if (onlyStatus) status = onlyStatus;
	}

	return {
		status,
		taskSource,
	};
}

function parseTaskSource(value: string): TaskSource | null {
	//
	if (value === 'public') return value;
	if (value === 'private') return value;
	return null;
}

function parseTaskPriority(value: string): CreateTaskInput['priority'] | null {
	//
	if (value === 'critical') return value;
	if (value === 'high') return value;
	if (value === 'medium') return value;
	if (value === 'low') return value;
	return null;
}

function parseTagDraft(value: string): string[] {
	//
	return dedupeStrings(
		value
			.split(',')
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0),
	);
}

function getMutationErrorMessage(error: unknown, fallback: string): string {
	//
	return error instanceof Error ? error.message : fallback;
}

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
			updateQueryInput({
				...queryInput,
				q: searchDraft,
			});
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			clearTimeout(debounceHandle);
		};
	}, [searchDraft, queryInput, updateQueryInput]);

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

		document.title = `${selectedTitle}`;
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
		const facetStatuses = (facets?.statuses ?? []).map((entry) => entry.value);
		return dedupeStrings(defaultStatusOptions.concat(queryInput.statuses, facetStatuses));
	}, [facets?.statuses, queryInput.statuses]);

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

		updateQueryInput({ ...queryInput, tags: nextTags });
	};

	const toggleRootsOnly = () => {
		updateQueryInput({
			...queryInput,
			rootsOnly: !queryInput.rootsOnly,
		});
	};

	const handleCreateTaskOpen = () => {
		setCreateTaskDefaults(getCreateTaskDefaults(queryInput));
		updateSearch({ taskKey: undefined });
	};

	const handleTaskCreated = (result: {
		status: string;
		taskKey: string;
		taskSource: TaskSource;
	}) => {
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
				<section className="border border-border rounded-lg overflow-hidden flex flex-col bg-card">
					<header className="border-b border-border p-3 space-y-3">
						<div className="flex items-center justify-between gap-2">
							<h1 className="text-lg font-semibold">Organizer</h1>
							<Button type="button" size="sm" variant="secondary" onClick={handleCreateTaskOpen}>
								<Plus className="size-4" />
								New
							</Button>
						</div>

						{shouldShowIndexUnavailable && (
							<div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm">
								<div className="font-medium text-destructive">Task indexes are unavailable.</div>
								{health?.errors.map((error) => (
									<div key={error} className="text-destructive/90 break-words">
										{error}
									</div>
								))}
								{health?.generatedDir && (
									<div className="text-muted-foreground mt-1">
										Expected: <code>{health.generatedDir}</code>
									</div>
								)}
							</div>
						)}

						<div className="space-y-2">
							<label className="text-sm font-medium" htmlFor={searchInputId}>
								Search
							</label>
							<input
								id={searchInputId}
								value={searchDraft}
								onChange={(event) => setSearchDraft(event.currentTarget.value)}
								placeholder="title, id, tags, body..."
								className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
							/>
						</div>

						<div className="grid gap-3 md:grid-cols-2">
							<div className="space-y-2">
								<div className="text-sm font-medium">Sources</div>
								<div className="space-y-1">
									{taskSourceOptions.map((source) => {
										const isSelected = queryInput.sources.includes(source);
										const facetCount =
											facets?.sources.find((entry) => entry.value === source)?.count ?? 0;

										return (
											<label
												key={source}
												className="flex items-center justify-between gap-2 text-sm cursor-pointer"
											>
												<span className="flex items-center gap-2">
													<input
														type="checkbox"
														className="cursor-pointer"
														checked={isSelected}
														onChange={() => toggleSource(source)}
													/>
													{formatSourceLabel(source)}
												</span>
												<span className="text-muted-foreground">{facetCount}</span>
											</label>
										);
									})}
								</div>
							</div>

							<div className="space-y-2">
								<div className="text-sm font-medium">Sort</div>
								<select
									value={queryInput.sort}
									onChange={(event) => {
										const parsedSort = explorerSortSchema.safeParse(event.currentTarget.value);
										if (!parsedSort.success) return;

										updateQueryInput({
											...queryInput,
											sort: parsedSort.data,
										});
									}}
									className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm cursor-pointer"
								>
									<option value="priority_then_recency">priority then recency</option>
									<option value="recency">recency</option>
									<option value="title">title A-Z</option>
								</select>
							</div>
						</div>

						<label className="flex items-center justify-between gap-3 text-sm cursor-pointer">
							<span className="font-medium">Root tasks only</span>
							<input
								type="checkbox"
								className="cursor-pointer"
								checked={queryInput.rootsOnly}
								onChange={toggleRootsOnly}
							/>
						</label>

						<div className="space-y-2">
							<div className="text-sm font-medium">Statuses</div>
							<div className="flex flex-wrap gap-2">
								{(facets?.statuses ?? []).map((statusEntry) => {
									const isSelected = queryInput.statuses.includes(statusEntry.value);
									return (
										<button
											key={statusEntry.value}
											type="button"
											onClick={() => toggleStatus(statusEntry.value)}
											className={cn(
												'px-2 py-1 rounded-md text-xs border cursor-pointer',
												isSelected
													? 'bg-primary text-primary-foreground border-primary'
													: 'bg-background text-foreground border-border',
											)}
										>
											{statusEntry.value} ({statusEntry.count})
										</button>
									);
								})}
							</div>
						</div>

						<div className="space-y-2">
							<div className="text-sm font-medium">Tags</div>
							<div className="flex flex-wrap gap-2 max-h-24 overflow-auto">
								{(facets?.tags ?? []).map((tagEntry) => {
									const isSelected = queryInput.tags.includes(tagEntry.value);

									return (
										<button
											key={tagEntry.value}
											type="button"
											onClick={() => toggleTag(tagEntry.value)}
											className={cn(
												'px-2 py-1 rounded-md text-xs border cursor-pointer',
												isSelected
													? 'bg-secondary text-secondary-foreground border-secondary'
													: 'bg-background text-foreground border-border',
											)}
										>
											{tagEntry.value} ({tagEntry.count})
										</button>
									);
								})}
							</div>
						</div>

						<div className="text-xs text-muted-foreground">
							{explorerQuery.data?.totals.visible ?? 0} visible / {explorerQuery.data?.totals.all ?? 0}{' '}
							total
						</div>
					</header>

					<div className="flex-1 overflow-auto divide-y divide-border">
						{explorerQuery.isPending && (
							<div className="p-3 text-sm text-muted-foreground">Loading tasks...</div>
						)}
						{!explorerQuery.isPending && visibleTasks.length === 0 && (
							<div className="p-3 text-sm text-muted-foreground">No tasks match the current filters.</div>
						)}

						{visibleTasks.map((task) => (
							<Link
								key={task.key}
								from="/"
								to="/"
								onClick={() => setCreateTaskDefaults(null)}
								search={(previous) => ({
									...previous,
									taskKey: task.key,
								})}
								className={cn(
									'block w-full text-left p-3 hover:bg-muted/50 transition-colors cursor-pointer',
									selectedTaskKey === task.key && 'bg-muted',
								)}
							>
								<div className="flex items-start justify-between gap-2">
									<div className="font-medium text-sm">{task.title}</div>
									{task.taskSource === 'private' ? (
										<Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Private task" />
									) : null}
								</div>

								<div className="mt-1 text-xs text-muted-foreground break-all">{task.id}</div>

								<div className="mt-2 flex flex-wrap gap-1">
									<span className="px-1.5 py-0.5 rounded border border-border text-xs">
										{task.status}
									</span>
									{task.priority && (
										<span className="px-1.5 py-0.5 rounded border border-border text-xs">
											{task.priority}
										</span>
									)}
								</div>

								{task.tags.length > 0 && (
									<div className="mt-2 flex flex-wrap gap-1">
										{task.tags.slice(0, 6).map((tag) => (
											<span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-xs">
												#{tag}
											</span>
										))}
									</div>
								)}
							</Link>
						))}
					</div>
				</section>

				<section className="border border-border rounded-lg overflow-hidden flex flex-col bg-card">
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

					{!isCreatingTask && selectedTaskKey !== null && !taskDetailQuery.isPending && taskDetailQuery.data?.task === null && (
						<div className="p-4 text-sm text-muted-foreground">Task not found in generated indexes.</div>
					)}

					{!isCreatingTask && taskDetailQuery.data?.task && (
						<TaskDetailView
							detail={taskDetailQuery.data}
							onNavigateTask={(taskKey) => updateSearch({ taskKey })}
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

function CreateTaskView({
	defaults,
	statusOptions,
	onCancel,
	onTaskCreated,
}: {
	defaults: CreateTaskDefaults;
	statusOptions: string[];
	onCancel: () => void;
	onTaskCreated: (result: {
		status: string;
		taskKey: string;
		taskSource: TaskSource;
	}) => void;
}) {
	//
	const titleInputId = useId();
	const sourceSelectId = useId();
	const statusInputId = useId();
	const statusOptionsListId = useId();
	const prioritySelectId = useId();
	const tagsInputId = useId();
	const bodyTextareaId = useId();
	const queryClient = useQueryClient();
	const createTaskServer = useServerFn(createTask);
	const [title, setTitle] = useState('');
	const [taskSource, setTaskSource] = useState<TaskSource>(defaults.taskSource);
	const [status, setStatus] = useState(defaults.status);
	const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
	const [priority, setPriority] = useState<CreateTaskInput['priority']>('medium');
	const [tagDraft, setTagDraft] = useState('');
	const [body, setBody] = useState('');
	const filteredStatusOptions = useMemo(() => {
		const normalizedStatus = status.trim().toLowerCase();
		if (normalizedStatus.length === 0) return statusOptions;

		return statusOptions.filter((statusOption) =>
			statusOption.toLowerCase().includes(normalizedStatus),
		);
	}, [status, statusOptions]);
	const createTaskMutation = useMutation({
		mutationFn: (input: CreateTaskInput) => createTaskServer({ data: input }),
		onSuccess: async (result) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);

			onTaskCreated({
				status: result.status,
				taskKey: result.newTaskKey,
				taskSource: result.taskSource,
			});
		},
	});

	useEffect(() => {
		setTaskSource(defaults.taskSource);
		setStatus(defaults.status);
		setIsStatusMenuOpen(false);
	}, [defaults.status, defaults.taskSource]);

	const handleSourceChange = (value: string) => {
		const parsedSource = parseTaskSource(value);
		if (parsedSource === null) return;
		setTaskSource(parsedSource);
	};

	const handlePriorityChange = (value: string) => {
		const parsedPriority = parseTaskPriority(value);
		if (parsedPriority === null) return;
		setPriority(parsedPriority);
	};

	const handleStatusBlur = () => {
		window.setTimeout(() => setIsStatusMenuOpen(false), 120);
	};

	const handleStatusOptionSelect = (statusOption: string) => {
		setStatus(statusOption);
		setIsStatusMenuOpen(false);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const trimmedTitle = title.trim();
		if (trimmedTitle.length === 0) return;

		createTaskMutation.mutate({
			body,
			priority,
			status,
			tags: parseTagDraft(tagDraft),
			taskSource,
			title: trimmedTitle,
		});
	};

	return (
		<div className="h-full overflow-auto">
			<header className="border-b border-border p-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="text-xl font-semibold">New task</h2>
						<div className="mt-1 text-xs text-muted-foreground">
							{taskSource}:{status || 'backlog'}
						</div>
					</div>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={onCancel}
						disabled={createTaskMutation.isPending}
					>
						<X className="size-4" />
						Cancel
					</Button>
				</div>
			</header>

			<form className="p-4 space-y-4" onSubmit={handleSubmit}>
				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor={titleInputId}>
						Title
					</label>
					<Input
						id={titleInputId}
						value={title}
						onChange={(event) => setTitle(event.currentTarget.value)}
						disabled={createTaskMutation.isPending}
						autoFocus
					/>
				</div>

				<div className="grid gap-3 md:grid-cols-3">
					<div className="space-y-2">
						<label className="text-sm font-medium" htmlFor={sourceSelectId}>
							Source
						</label>
						<select
							id={sourceSelectId}
							value={taskSource}
							onChange={(event) => handleSourceChange(event.currentTarget.value)}
							disabled={createTaskMutation.isPending}
							className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
						>
							{taskSourceOptions.map((source) => (
								<option key={source} value={source}>
									{formatSourceLabel(source)}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium" htmlFor={statusInputId}>
							Status
						</label>
						<div className="relative">
							<Input
								id={statusInputId}
								value={status}
								onChange={(event) => {
									setStatus(event.currentTarget.value);
									setIsStatusMenuOpen(true);
								}}
								onFocus={() => setIsStatusMenuOpen(true)}
								onBlur={handleStatusBlur}
								disabled={createTaskMutation.isPending}
								autoComplete="off"
								role="combobox"
								aria-expanded={isStatusMenuOpen}
								aria-controls={statusOptionsListId}
								className="pr-9"
							/>
							<Button
								type="button"
								size="icon-xs"
								variant="ghost"
								aria-label="Show statuses"
								disabled={createTaskMutation.isPending}
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
								className="absolute right-1 top-1/2 -translate-y-1/2"
							>
								<ChevronDown className="size-3" />
							</Button>
							{isStatusMenuOpen ? (
								<div
									id={statusOptionsListId}
									role="listbox"
									className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-sm shadow-md"
								>
									{filteredStatusOptions.map((statusOption) => (
										<button
											key={statusOption}
											type="button"
											role="option"
											aria-selected={statusOption === status}
											onMouseDown={(event) => event.preventDefault()}
											onClick={() => handleStatusOptionSelect(statusOption)}
											className={cn(
												'block w-full rounded-sm px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground',
												statusOption === status && 'bg-accent text-accent-foreground',
											)}
										>
											{statusOption}
										</button>
									))}
									{filteredStatusOptions.length === 0 ? (
										<div className="px-2 py-1.5 text-muted-foreground">
											Type a new status
										</div>
									) : null}
								</div>
							) : null}
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-sm font-medium" htmlFor={prioritySelectId}>
							Priority
						</label>
						<select
							id={prioritySelectId}
							value={priority}
							onChange={(event) => handlePriorityChange(event.currentTarget.value)}
							disabled={createTaskMutation.isPending}
							className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
						>
							{taskPriorityOptions.map((priorityOption) => (
								<option key={priorityOption} value={priorityOption}>
									{priorityOption}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor={tagsInputId}>
						Tags
					</label>
					<Input
						id={tagsInputId}
						value={tagDraft}
						onChange={(event) => setTagDraft(event.currentTarget.value)}
						placeholder="debt, ux"
						disabled={createTaskMutation.isPending}
					/>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor={bodyTextareaId}>
						Body
					</label>
					<Textarea
						id={bodyTextareaId}
						value={body}
						onChange={(event) => setBody(event.currentTarget.value)}
						placeholder="Context, objective, subtasks, notes..."
						disabled={createTaskMutation.isPending}
						className="min-h-64 resize-y"
					/>
				</div>

				{createTaskMutation.error ? (
					<div className="text-sm text-destructive">
						{getMutationErrorMessage(createTaskMutation.error, 'failed to create task')}
					</div>
				) : null}

				<div className="flex justify-end gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={createTaskMutation.isPending}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={createTaskMutation.isPending || title.trim().length === 0}
					>
						<Plus className="size-4" />
						{createTaskMutation.isPending ? 'Creating...' : 'Create'}
					</Button>
				</div>
			</form>
		</div>
	);
}

function TaskDetailView({
	detail,
	onNavigateTask,
	onTaskCompleted,
}: {
	detail: TaskDetailResult;
	onNavigateTask: (taskKey: string) => void;
	onTaskCompleted: (taskKey: string) => void;
}) {
	//
	if (!detail.task) return null;

	return (
		<TaskDetailContent
			key={detail.task.key}
			detail={detail}
			task={detail.task}
			onNavigateTask={onNavigateTask}
			onTaskCompleted={onTaskCompleted}
		/>
	);
}

function TaskDetailContent({
	detail,
	task,
	onNavigateTask,
	onTaskCompleted,
}: {
	detail: TaskDetailResult;
	task: TaskDetailTask;
	onNavigateTask: (taskKey: string) => void;
	onTaskCompleted: (taskKey: string) => void;
}) {
	//
	const tagInputId = useId();
	const queryClient = useQueryClient();
	const markTaskDoneServer = useServerFn(markTaskDone);
	const updateTaskTagsServer = useServerFn(updateTaskTags);
	const relatedTasks = detail.relatedTasks ?? [];
	const relatedTaskByKey = new Map(relatedTasks.map((relatedTask) => [relatedTask.key, relatedTask]));
	const cursorFileHref = toCursorFileHref(task.absolutePath);
	const cursorTaskHref = toCursorTaskHref(task);
	const codexTaskHref = toCodexTaskHref(task);
	const canMarkDone = task.status !== 'completed';
	const [tagDraft, setTagDraft] = useState('');
	const markTaskDoneMutation = useMutation({
		mutationFn: () => markTaskDoneServer({ data: { taskKey: task.key } }),
		onSuccess: async (result) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);

			onTaskCompleted(result.newTaskKey);
		},
	});
	const updateTaskTagsMutation = useMutation({
		mutationFn: ({
			action,
			tag,
		}: {
			action: 'add' | 'remove';
			tag: string;
		}) => updateTaskTagsServer({ data: { taskKey: task.key, action, tag } }),
		onSuccess: async (_, variables) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['tasks-explorer'] }),
				queryClient.invalidateQueries({ queryKey: ['task-detail'] }),
			]);

			if (variables.action === 'add') {
				setTagDraft('');
			}
		},
	});

	const handleTagSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (tagDraft.trim().length === 0) return;

		updateTaskTagsMutation.mutate({
			action: 'add',
			tag: tagDraft,
		});
	};

	const handleTagRemove = (tag: string) => {
		updateTaskTagsMutation.mutate({
			action: 'remove',
			tag,
		});
	};

	const renderRelation = (label: string, keys: string[]) => {
		if (keys.length === 0) return null;

		return (
			<div className="space-y-1">
				<div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
				<div className="space-y-1">
					{keys.map((key) => {
						const related = relatedTaskByKey.get(key);
						const title = related?.title ?? key;

						return (
							<button
								key={key}
								type="button"
								onClick={() => onNavigateTask(key)}
								className="block text-left w-full rounded-md border border-border px-2 py-1 hover:bg-muted text-sm cursor-pointer"
							>
								<div className="font-medium">{title}</div>
								<div className="text-xs text-muted-foreground break-all">{key}</div>
							</button>
						);
					})}
				</div>
			</div>
		);
	};

	return (
		<div className="h-full overflow-auto">
			<header className="border-b border-border p-4 flex flex-col gap-0">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
							<h2 className="text-xl font-semibold">{task.title}</h2>
							<span className="text-sm text-muted-foreground break-all">{task.id}</span>
						</div>
					</div>

					{canMarkDone ? (
						<Button
							type="button"
							size="sm"
							variant="secondary"
							onClick={() => markTaskDoneMutation.mutate()}
							disabled={markTaskDoneMutation.isPending}
						>
							<Check className="size-4" />
							{markTaskDoneMutation.isPending ? 'Marking done...' : 'Mark done'}
						</Button>
					) : null}
				</div>
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground break-all">
					{cursorFileHref ? (
						<a
							href={cursorFileHref}
							target="_blank"
							rel="noopener noreferrer"
							className="cursor-pointer underline underline-offset-4 hover:text-foreground"
						>
							{task.relativePath}
						</a>
					) : (
						<span>{task.relativePath}</span>
					)}
					<a
						href={cursorTaskHref}
						target="_blank"
						rel="noopener noreferrer"
						className="cursor-pointer underline underline-offset-4 hover:text-foreground"
					>
						Open in Cursor
					</a>
					<a
						href={codexTaskHref}
						target="_blank"
						rel="noopener noreferrer"
						className="cursor-pointer underline underline-offset-4 hover:text-foreground"
					>
						Open in Codex
					</a>
				</div>

				<div className="mt-3 space-y-2">
					<div className="text-xs uppercase tracking-wide text-muted-foreground">Tags</div>
					<div className="flex flex-wrap gap-1">
						{task.tags.map((tag) => (
							<Button
								key={tag}
								type="button"
								size="xs"
								variant="outline"
								onClick={() => handleTagRemove(tag)}
								disabled={updateTaskTagsMutation.isPending}
								className="gap-1"
							>
								<span>#{tag}</span>
								<X className="size-3" />
							</Button>
						))}
						{task.tags.length === 0 && (
							<div className="text-xs text-muted-foreground">No tags yet.</div>
						)}
					</div>
					<form className="flex gap-2" onSubmit={handleTagSubmit}>
						<label className="sr-only" htmlFor={tagInputId}>
							Add tag
						</label>
						<Input
							id={tagInputId}
							value={tagDraft}
							onChange={(event) => setTagDraft(event.currentTarget.value)}
							placeholder="add tag"
							disabled={updateTaskTagsMutation.isPending}
						/>
						<Button
							type="submit"
							size="sm"
							variant="secondary"
							disabled={updateTaskTagsMutation.isPending || tagDraft.trim().length === 0}
						>
							{updateTaskTagsMutation.isPending ? 'Saving...' : 'Add tag'}
						</Button>
					</form>
				</div>

				<div className="flex flex-wrap gap-2 text-xs mt-2">
					<span className="px-2 py-1 rounded-md border border-border">{task.taskSource}</span>
					<span className="px-2 py-1 rounded-md border border-border">{task.status}</span>
					{task.priority && (
						<span className="px-2 py-1 rounded-md border border-border">{task.priority}</span>
					)}
				</div>

				{markTaskDoneMutation.error ? (
					<div className="mt-2 text-sm text-destructive">
						{markTaskDoneMutation.error instanceof Error
							? markTaskDoneMutation.error.message
							: 'failed to mark task as done'}
					</div>
				) : null}
				{updateTaskTagsMutation.error ? (
					<div className="mt-2 text-sm text-destructive">
						{updateTaskTagsMutation.error instanceof Error
							? updateTaskTagsMutation.error.message
							: 'failed to update task tags'}
					</div>
				) : null}
			</header>

			<div className="p-4 space-y-4">
				<div className="grid gap-4 md:grid-cols-2">
					{detail.relations.parentKey && renderRelation('Parent', [detail.relations.parentKey])}
					{renderRelation('Children', detail.relations.children)}
				</div>

				<Mdx text={task.body} className="text-sm" />

				{task.warnings.length > 0 && (
					<details className="rounded-md border border-border/60 bg-muted/20 p-2 text-xs text-muted-foreground">
						<summary className="cursor-pointer font-medium">
							Warnings ({task.warnings.length})
						</summary>
						<ul className="mt-2 list-disc pl-5 space-y-1">
							{task.warnings.map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
					</details>
				)}
			</div>
		</div>
	);
}
