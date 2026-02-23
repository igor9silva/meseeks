import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useCallback, useEffect, useId, useMemo } from 'react';
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
import { getExplorerSnapshot, getTaskDetail } from '~/server/taskExplorer';

function formatSourceLabel(source: TaskSource): string {
	//
	return source === 'private' ? 'Private' : 'Public';
}

const taskSourceOptions: TaskSource[] = ['public', 'private'];

export function TaskExplorerPage({ search }: { search: ExplorerRouteSearch }) {
	//
	const navigate = useNavigate({ from: '/' });
	const searchInputId = useId();
	const queryInput = useMemo(() => parseExplorerQuery(search), [search]);
	const selectedTaskKey = search.taskKey ?? null;
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
				replace: true,
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
				sort: nextQuery.sort,
			});
		},
		[updateSearch],
	);

	useEffect(() => {
		if (!selectedTaskKey) return;
		if (explorerQuery.isFetching) return;
		if (!explorerQuery.data) return;
		if (!explorerQuery.data.health.isReady) return;

		const tasks = explorerQuery.data.tasks;
		const isVisible = tasks.some((task) => task.key === selectedTaskKey);
		if (isVisible) return;

		updateSearch({ taskKey: undefined });
	}, [selectedTaskKey, explorerQuery.data, explorerQuery.isFetching, updateSearch]);

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
								value={queryInput.q}
								onChange={(event) =>
									updateQueryInput({
										...queryInput,
										q: event.currentTarget.value,
									})
								}
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
									<div className="text-[10px] uppercase tracking-wide text-muted-foreground">
										{task.taskSource}
									</div>
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

								<div className="mt-2 text-xs text-muted-foreground line-clamp-2">
									{task.bodyExcerpt}
								</div>
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
}: {
	detail: NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>;
	onNavigateTask: (taskKey: string) => void;
}) {
	//
	if (!detail.task) return null;

	const relatedTaskByKey = new Map(detail.relatedTasks.map((task) => [task.key, task]));

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
			<header className="border-b border-border p-4 space-y-2">
				<h2 className="text-xl font-semibold">{detail.task.title}</h2>
				<div className="text-sm text-muted-foreground break-all">{detail.task.id}</div>
				<div className="text-xs text-muted-foreground break-all">{detail.task.relativePath}</div>

				<div className="flex flex-wrap gap-2 text-xs">
					<span className="px-2 py-1 rounded-md border border-border">{detail.task.taskSource}</span>
					<span className="px-2 py-1 rounded-md border border-border">{detail.task.status}</span>
					{detail.task.priority && (
						<span className="px-2 py-1 rounded-md border border-border">{detail.task.priority}</span>
					)}
				</div>
			</header>

			<div className="p-4 space-y-4">
				{detail.task.tags.length > 0 && (
					<div className="space-y-1">
						<div className="text-xs uppercase tracking-wide text-muted-foreground">Tags</div>
						<div className="flex flex-wrap gap-1">
							{detail.task.tags.map((tag) => (
								<span key={tag} className="px-2 py-1 rounded-md bg-muted text-xs">
									#{tag}
								</span>
							))}
						</div>
					</div>
				)}

				<div className="grid gap-4 md:grid-cols-2">
					{detail.relations.parentKey && renderRelation('Parent', [detail.relations.parentKey])}
					{renderRelation('Children', detail.relations.children)}
					{renderRelation('Blocks', detail.relations.blocks)}
					{renderRelation('Blocked by', detail.relations.blockedBy)}
				</div>

				<div className="space-y-2">
					<div className="text-xs uppercase tracking-wide text-muted-foreground">Body</div>
					<Mdx text={detail.task.body} className="text-sm" />
				</div>

				{detail.task.rawFrontmatter && (
					<details className="rounded-md border border-border p-3">
						<summary className="cursor-pointer text-sm font-medium">Raw frontmatter</summary>
						<pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
							{detail.task.rawFrontmatter}
						</pre>
					</details>
				)}

				{detail.task.warnings.length > 0 && (
					<div className="space-y-1 rounded-md border border-orange-500/30 bg-orange-500/10 p-3">
						<div className="text-xs uppercase tracking-wide text-orange-300">Warnings</div>
						<ul className="list-disc pl-5 space-y-1 text-sm text-orange-200/90">
							{detail.task.warnings.map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
}
