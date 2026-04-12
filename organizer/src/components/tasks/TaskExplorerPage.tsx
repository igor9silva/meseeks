import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { Check, Lock, X } from 'lucide-react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Mdx } from '~/components/ui/mdx';
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
	getExplorerSnapshot,
	getTaskDetail,
	markTaskDone,
	updateTaskTags,
} from '~/server/taskExplorer';

function formatSourceLabel(source: TaskSource): string {
	//
	return source === 'private' ? 'Private' : 'Public';
}

type TaskDetailTask = NonNullable<NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>['task']>;

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

const taskSourceOptions: TaskSource[] = ['public', 'private'];
const SEARCH_DEBOUNCE_MS = 150;

export function TaskExplorerPage({ search }: { search: ExplorerRouteSearch }) {
	//
	const navigate = useNavigate({ from: '/' });
	const searchInputId = useId();
	const queryInput = useMemo(() => parseExplorerQuery(search), [search]);
	const selectedTaskKey = search.taskKey ?? null;
	const [searchDraft, setSearchDraft] = useState(queryInput.q);
	const lastCommittedSearchRef = useRef(queryInput.q);
	const getExplorerSnapshotServer = useServerFn(getExplorerSnapshot);
	const getTaskDetailServer = useServerFn(getTaskDetail);

	const explorerQuery = useQuery({
		queryKey: ['tasks-explorer', queryInput],
		queryFn: () => getExplorerSnapshotServer({ data: queryInput }),
		placeholderData: (previousData) => previousData,
		refetchInterval: 2000,
	});

	const taskDetailQuery = useQuery({
		queryKey: ['task-detail', selectedTaskKey],
		enabled: Boolean(selectedTaskKey),
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
	}, [selectedTaskKey, taskDetailQuery.data?.task?.title]);

	const health = explorerQuery.data?.health;
	const shouldShowIndexUnavailable = explorerQuery.isFetched && health !== undefined && !health.isReady;
	const visibleTasks = explorerQuery.data?.tasks ?? [];
	const facets = explorerQuery.data?.facets;

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

	return (
		<div
			className="h-screen bg-background p-3 text-foreground"
			style={{ backgroundColor: '#09090b', color: '#fafafa' }}
		>
			<div className="grid h-full gap-3 lg:grid-cols-[minmax(360px,460px)_1fr]">
				<section className="border border-border rounded-lg overflow-hidden flex flex-col bg-card">
					<header className="border-b border-border p-3 space-y-3">
						<h1 className="text-lg font-semibold">Organizer</h1>

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
					{selectedTaskKey === null && (
						<div className="p-4 text-sm text-muted-foreground">
							Select a task from the left list to inspect details.
						</div>
					)}

					{selectedTaskKey !== null && taskDetailQuery.isPending && (
						<div className="p-4 text-sm text-muted-foreground">Loading task detail...</div>
					)}

					{selectedTaskKey !== null && !taskDetailQuery.isPending && taskDetailQuery.data?.task === null && (
						<div className="p-4 text-sm text-muted-foreground">Task not found in generated indexes.</div>
					)}

					{taskDetailQuery.data?.task && (
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

function TaskDetailView({
	detail,
	onNavigateTask,
	onTaskCompleted,
}: {
	detail: NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>;
	onNavigateTask: (taskKey: string) => void;
	onTaskCompleted: (taskKey: string) => void;
}) {
	//
	if (!detail.task) return null;

	const tagInputId = useId();
	const queryClient = useQueryClient();
	const markTaskDoneServer = useServerFn(markTaskDone);
	const updateTaskTagsServer = useServerFn(updateTaskTags);
	const relatedTaskByKey = new Map(detail.relatedTasks.map((task) => [task.key, task]));
	const cursorFileHref = toCursorFileHref(detail.task.absolutePath);
	const cursorTaskHref = toCursorTaskHref(detail.task);
	const codexTaskHref = toCodexTaskHref(detail.task);
	const canMarkDone = detail.task.status !== 'completed';
	const [tagDraft, setTagDraft] = useState('');
	const markTaskDoneMutation = useMutation({
		mutationFn: () => markTaskDoneServer({ data: { taskKey: detail.task.key } }),
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
		}) => updateTaskTagsServer({ data: { taskKey: detail.task.key, action, tag } }),
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

	useEffect(() => {
		setTagDraft('');
	}, [detail.task.key]);

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
							<h2 className="text-xl font-semibold">{detail.task.title}</h2>
							<span className="text-sm text-muted-foreground break-all">{detail.task.id}</span>
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
							{detail.task.relativePath}
						</a>
					) : (
						<span>{detail.task.relativePath}</span>
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
						{detail.task.tags.map((tag) => (
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
						{detail.task.tags.length === 0 && (
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
					<span className="px-2 py-1 rounded-md border border-border">{detail.task.taskSource}</span>
					<span className="px-2 py-1 rounded-md border border-border">{detail.task.status}</span>
					{detail.task.priority && (
						<span className="px-2 py-1 rounded-md border border-border">{detail.task.priority}</span>
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

				<Mdx text={detail.task.body} className="text-sm" />

				{detail.task.warnings.length > 0 && (
					<details className="rounded-md border border-border/60 bg-muted/20 p-2 text-xs text-muted-foreground">
						<summary className="cursor-pointer font-medium">
							Warnings ({detail.task.warnings.length})
						</summary>
						<ul className="mt-2 list-disc pl-5 space-y-1">
							{detail.task.warnings.map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
					</details>
				)}
			</div>
		</div>
	);
}
