import { Badge, Button, Input, cn } from '@reactor/ui';
import { Link } from '@tanstack/react-router';
import {
	AlertTriangle,
	Archive,
	CheckCircle2,
	CircleDot,
	Eye,
	EyeOff,
	Inbox,
	Layers,
	Lightbulb,
	Lock,
	Plus,
	Search,
} from 'lucide-react';
import {
	type ExplorerQueryInput,
	type ExplorerSort,
	explorerSortSchema,
	type TaskSource,
} from '~/lib/explorerSearchParams';
import { formatTaskBucketLabel, isTaskBucket, taskBuckets } from '~/lib/taskBuckets';
import { compareTagGroupKeys, formatTagGroupLabel, getTagGroupLookupKey, parseTaskTag } from '~/lib/taskTags';
import type { ExplorerFacets, ExplorerHealth, ExplorerTask, ExplorerTotals } from './taskExplorerTypes';
import { formatSourceLabel, getTaskDisplayFilename, taskSourceOptions } from './taskExplorerUtils';

export function TaskBoard({
	className,
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
	onSearchDraftChange,
	onCreateTaskOpen,
	onPrivateBlurToggle,
	onSourceToggle,
	onStatusToggle,
	onTagFilterCycle,
	onRootsOnlyToggle,
	onSortChange,
	onTaskSelect,
}: {
	className?: string;
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
	onSearchDraftChange: (value: string) => void;
	onCreateTaskOpen: () => void;
	onPrivateBlurToggle: () => void;
	onSourceToggle: (source: TaskSource) => void;
	onStatusToggle: (status: string) => void;
	onTagFilterCycle: (tag: string) => void;
	onRootsOnlyToggle: () => void;
	onSortChange: (sort: ExplorerSort) => void;
	onTaskSelect: () => void;
}) {
	//
	const statusFacetEntries = facets?.statuses ?? [];
	const boardStatuses = buildBoardStatuses(queryInput.statuses);
	const tasksByStatus = groupTasksByStatus(visibleTasks, boardStatuses);
	const tagGroups = buildTagGroups(facets?.tagGroups ?? [], queryInput.tags.concat(queryInput.excludedTags));
	const offBucketEntries = statusFacetEntries.filter((entry) => !isTaskBucket(entry.value));
	const hiddenOffBucketCount = offBucketEntries.reduce((total, entry) => {
		if (queryInput.statuses.includes(entry.value)) return total;
		return total + entry.count;
	}, 0);

	return (
		<section
			className={cn(
				'flex min-h-0 flex-col overflow-hidden border border-border/80 bg-background text-foreground',
				className,
			)}
		>
			<header className="border-b border-border/80 bg-card/95">
				<div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
					<div className="min-w-0">
						<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
							<h1 className="text-lg font-semibold">
								<Link
									from="/"
									to="/"
									search={{}}
									className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								>
									Organizer
								</Link>
							</h1>
							<span className="text-xs text-muted-foreground">
								{totals?.visible ?? 0} visible / {totals?.all ?? 0} indexed
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<nav className="flex items-center gap-1 text-xs text-muted-foreground">
							<Link from="/" to="/report" className="rounded px-1.5 py-1 hover:bg-accent hover:text-foreground">
								report
							</Link>
							<Link from="/" to="/tags" className="rounded px-1.5 py-1 hover:bg-accent hover:text-foreground">
								tags
							</Link>
						</nav>
						<Button
							type="button"
							size="action"
							variant={shouldBlurPrivateTasks ? 'secondary' : 'ghost'}
							aria-pressed={shouldBlurPrivateTasks}
							aria-label={shouldBlurPrivateTasks ? 'Show private task content' : 'Blur private task content'}
							title={shouldBlurPrivateTasks ? 'Show private task content' : 'Blur private task content'}
							onClick={onPrivateBlurToggle}
							className="rounded-md"
						>
							{shouldBlurPrivateTasks ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
						</Button>
						<Button type="button" size="sm" onClick={onCreateTaskOpen} className="rounded-md">
							<Plus className="size-4" />
							New
						</Button>
					</div>
				</div>

				{shouldShowIndexUnavailable ? (
					<div className="border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
						<div className="flex items-center gap-2 font-medium text-destructive">
							<AlertTriangle className="size-4" />
							Task indexes are unavailable
						</div>
						{health?.errors.map((error) => (
							<div key={error} className="break-words text-destructive/90">
								{error}
							</div>
						))}
						{health?.generatedDir ? (
							<div className="mt-1 text-muted-foreground">
								Expected <code>{health.generatedDir}</code>
							</div>
						) : null}
					</div>
				) : null}

				<div className="flex flex-wrap items-center gap-2 border-t border-border/80 px-3 py-3">
					<div className="relative min-w-80 flex-1">
						<label className="sr-only" htmlFor={searchInputId}>
							Search tasks
						</label>
						<Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							id={searchInputId}
							value={searchDraft}
							onChange={(event) => onSearchDraftChange(event.currentTarget.value)}
							placeholder="Search title, id, tags, body"
							className="h-9 rounded-md pl-8"
						/>
					</div>

					<div className="flex shrink-0 flex-wrap items-center gap-1">
						{taskSourceOptions.map((source) => (
							<SourceFilterButton
								key={source}
								source={source}
								count={findFacetCount(facets?.sources ?? [], source)}
								isSelected={queryInput.sources.includes(source)}
								shouldBlurPrivateTasks={shouldBlurPrivateTasks}
								onClick={() => onSourceToggle(source)}
							/>
						))}

						<label className="ml-1 inline-flex h-8 items-center gap-2 rounded-md border border-border/80 bg-background px-2 text-xs text-foreground">
							<input
								type="checkbox"
								checked={!queryInput.rootsOnly}
								onChange={onRootsOnlyToggle}
								className="size-3.5"
							/>
							Include subtasks
						</label>

						<select
							value={queryInput.sort}
							onChange={(event) => {
								const parsedSort = explorerSortSchema.safeParse(event.currentTarget.value);
								if (!parsedSort.success) return;
								onSortChange(parsedSort.data);
							}}
							className="h-8 rounded-md border border-input bg-background px-2 text-xs"
						>
							<option value="priority_then_recency">priority</option>
							<option value="recency">recency</option>
							<option value="title">title</option>
						</select>
					</div>
				</div>

				<div className="space-y-2 border-t border-border/80 px-3 py-2">
					<div className="flex flex-wrap items-center gap-1">
						{taskBuckets.map((bucket) => (
							<StatusFilterButton
								key={bucket}
								status={bucket}
								count={findFacetCount(statusFacetEntries, bucket)}
								isSelected={queryInput.statuses.includes(bucket)}
								onClick={() => onStatusToggle(bucket)}
							/>
						))}
						{offBucketEntries.map((entry) => (
							<StatusFilterButton
								key={entry.value}
								status={entry.value}
								count={entry.count}
								isSelected={queryInput.statuses.includes(entry.value)}
								onClick={() => onStatusToggle(entry.value)}
							/>
						))}
						{hiddenOffBucketCount > 0 ? (
							<span className="inline-flex h-8 items-center rounded-md border border-amber-500/30 px-2 text-xs text-amber-200">
								{hiddenOffBucketCount} off-bucket hidden
							</span>
						) : null}
					</div>

					{tagGroups.length > 0 ? (
						<div className="max-h-52 space-y-2 overflow-auto">
							{tagGroups.map((group) => (
								<TagFilterGroup
									key={getTagGroupLookupKey(group.key)}
									group={group}
									includedTags={queryInput.tags}
									excludedTags={queryInput.excludedTags}
									onTagFilterCycle={onTagFilterCycle}
								/>
							))}
						</div>
					) : null}
				</div>
			</header>

			<div className="min-h-0 flex-1 overflow-auto">
				{isPending ? <div className="px-3 py-4 text-sm text-muted-foreground">Loading tasks...</div> : null}
				{!isPending && visibleTasks.length === 0 ? (
					<div className="px-3 py-4 text-sm text-muted-foreground">No tasks match these filters.</div>
				) : null}

				<div className="flex min-h-full min-w-0 border-t border-border/80">
					{boardStatuses.map((status) => (
						<BucketColumn
							key={status}
							status={status}
							tasks={tasksByStatus.get(status) ?? []}
							selectedTaskKey={selectedTaskKey}
							shouldBlurPrivateTasks={shouldBlurPrivateTasks}
							onTaskSelect={onTaskSelect}
						/>
					))}
				</div>
			</div>
		</section>
	);
}

function SourceFilterButton({
	source,
	count,
	isSelected,
	shouldBlurPrivateTasks,
	onClick,
}: {
	source: TaskSource;
	count: number;
	isSelected: boolean;
	shouldBlurPrivateTasks: boolean;
	onClick: () => void;
}) {
	//
	const shouldBlurCount = shouldBlurPrivateTasks && source === 'private';

	return (
		<button
			type="button"
			aria-pressed={isSelected}
			onClick={onClick}
			className={cn(
				'inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs transition-colors',
				isSelected
					? 'border-foreground bg-foreground text-background'
					: 'border-border/80 bg-background text-foreground/80 hover:border-foreground/40 hover:text-foreground',
			)}
		>
			{source === 'private' ? <Lock className="size-3" /> : <Layers className="size-3" />}
			{formatSourceLabel(source)}
			<span className={cn('tabular-nums opacity-70', getPrivateBlurClassName(shouldBlurCount))}>{count}</span>
		</button>
	);
}

function StatusFilterButton({
	status,
	count,
	isSelected,
	onClick,
}: {
	status: string;
	count: number;
	isSelected: boolean;
	onClick: () => void;
}) {
	//
	return (
		<button
			type="button"
			aria-pressed={isSelected}
			onClick={onClick}
			className={cn(
				'inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs transition-colors',
				isSelected
					? 'border-sky-400/70 bg-sky-400/15 text-sky-100'
					: 'border-border/80 bg-background text-foreground/80 hover:border-foreground/40 hover:text-foreground',
				!isTaskBucket(status) && 'border-amber-500/30',
			)}
		>
			{renderStatusIcon(status)}
			{formatTaskBucketLabel(status)}
			<span className="tabular-nums opacity-70">{count}</span>
		</button>
	);
}

function TagFilterGroup({
	group,
	includedTags,
	excludedTags,
	onTagFilterCycle,
}: {
	group: ExplorerFacets['tagGroups'][number];
	includedTags: string[];
	excludedTags: string[];
	onTagFilterCycle: (tag: string) => void;
}) {
	//
	return (
		<div className="flex min-w-0 items-start gap-2">
			<div className="flex h-7 w-28 shrink-0 items-center text-xs text-muted-foreground">
				{formatTagGroupLabel(group.key)}
			</div>
			<div className="flex max-h-40 flex-1 flex-wrap gap-1 overflow-auto">
				{group.entries.map((entry) => {
					const isIncluded = includedTags.includes(entry.tag);
					const isExcluded = excludedTags.includes(entry.tag);

					return (
						<button
							key={entry.tag}
							type="button"
							aria-pressed={isIncluded || isExcluded}
							title={entry.tag}
							onClick={() => onTagFilterCycle(entry.tag)}
							className={cn(
								'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs transition-colors',
								isIncluded
									? 'border-emerald-400/70 bg-emerald-400/15 text-emerald-100'
									: 'border-border/80 bg-background text-foreground/80 hover:border-foreground/40 hover:text-foreground',
								isExcluded && 'border-red-400/70 bg-red-400/15 text-red-100',
							)}
						>
							{entry.value}
							<span className="tabular-nums opacity-70">{entry.count}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function BucketColumn({
	status,
	tasks,
	selectedTaskKey,
	shouldBlurPrivateTasks,
	onTaskSelect,
}: {
	status: string;
	tasks: ExplorerTask[];
	selectedTaskKey: string | null;
	shouldBlurPrivateTasks: boolean;
	onTaskSelect: () => void;
}) {
	//
	return (
		<section className="min-h-64 min-w-72 flex-1 border-b border-r border-border/80 last:border-r-0 sm:border-b-0">
			<header className="sticky top-0 z-10 border-b border-border/80 bg-card/95 px-3 py-2">
				<div className="flex items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2">
						{renderStatusIcon(status)}
						<h2 className="truncate text-sm font-semibold">{formatTaskBucketLabel(status)}</h2>
					</div>
					<Badge variant="outline" className="shrink-0 rounded-md px-1.5 py-0 text-xs tabular-nums">
						{tasks.length}
					</Badge>
				</div>
				{!isTaskBucket(status) ? (
					<div className="mt-1 text-xs text-amber-200">Topic folder, not a lifecycle bucket.</div>
				) : null}
			</header>

			<div className="divide-y divide-border/80">
				{tasks.length === 0 ? (
					<div className="px-3 py-4 text-xs text-muted-foreground">No visible tasks.</div>
				) : null}
				{tasks.map((task) => (
					<TaskRow
						key={task.key}
						task={task}
						isSelected={selectedTaskKey === task.key}
						shouldBlurPrivateTasks={shouldBlurPrivateTasks}
						onTaskSelect={onTaskSelect}
					/>
				))}
			</div>
		</section>
	);
}

function TaskRow({
	task,
	isSelected,
	shouldBlurPrivateTasks,
	onTaskSelect,
}: {
	task: ExplorerTask;
	isSelected: boolean;
	shouldBlurPrivateTasks: boolean;
	onTaskSelect: () => void;
}) {
	//
	const shouldBlurTask = shouldBlurPrivateTasks && task.taskSource === 'private';

	return (
		<Link
			from="/"
			to="/"
			onClick={onTaskSelect}
			search={(previous) => ({
				...previous,
				taskKey: task.key,
			})}
			className={cn(
				'block min-h-24 border-l-2 px-3 py-2 text-left transition-colors hover:bg-muted/60',
				getPriorityBorderClassName(task.priority),
				isSelected && 'bg-muted',
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className={cn('min-w-0 flex-1', getPrivateBlurClassName(shouldBlurTask))}>
					<div className="min-w-0 break-all text-sm font-medium leading-5 text-foreground">{task.title}</div>

					<div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
						<span className="break-all text-foreground/85">{getTaskDisplayFilename(task.relativePath)}</span>
						<span>{formatTaskDate(task.fileMtimeMs)}</span>
						{task.priority ? (
							<span className={cn('rounded px-1', getPriorityClassName(task.priority))}>{task.priority}</span>
						) : null}
					</div>

					{task.tags.length > 0 ? (
						<div className="mt-2 flex flex-wrap gap-1">
							{task.tags.slice(0, 5).map((tag) => (
								<span key={tag} className={cn('rounded px-1.5 py-0.5 text-xs', getTagClassName(tag))}>
									{tag}
								</span>
							))}
							{task.tags.length > 5 ? (
								<span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
									+{task.tags.length - 5}
								</span>
							) : null}
						</div>
					) : null}
				</div>
				<div className="flex shrink-0 items-center gap-1">
					{task.warningCount > 0 ? (
						<AlertTriangle
							className="size-3.5 text-amber-300"
							aria-label={`${task.warningCount} warnings`}
						/>
					) : null}
					{task.taskSource === 'private' ? (
						<Lock className="size-3.5 text-muted-foreground" aria-label="Private task" />
					) : null}
				</div>
			</div>
		</Link>
	);
}

function getPrivateBlurClassName(shouldBlur: boolean): string {
	//
	return shouldBlur ? 'select-none blur-xs' : '';
}

function buildBoardStatuses(selectedStatuses: string[]): string[] {
	//
	const statuses: string[] = [];

	for (const bucket of taskBuckets) {
		if (!selectedStatuses.includes(bucket)) continue;
		statuses.push(bucket);
	}

	for (const status of selectedStatuses) {
		if (statuses.includes(status)) continue;
		statuses.push(status);
	}

	return statuses;
}

function groupTasksByStatus(tasks: ExplorerTask[], statuses: string[]): Map<string, ExplorerTask[]> {
	//
	const tasksByStatus = new Map<string, ExplorerTask[]>();

	for (const status of statuses) {
		tasksByStatus.set(status, []);
	}

	for (const task of tasks) {
		const tasksForStatus = tasksByStatus.get(task.status);
		if (tasksForStatus) {
			tasksForStatus.push(task);
			continue;
		}

		tasksByStatus.set(task.status, [task]);
	}

	return tasksByStatus;
}

function buildTagGroups(facetGroups: ExplorerFacets['tagGroups'], pinnedTags: string[]): ExplorerFacets['tagGroups'] {
	//
	const groupsByKey = new Map<string, ExplorerFacets['tagGroups'][number]>();

	for (const group of facetGroups) {
		groupsByKey.set(getTagGroupLookupKey(group.key), {
			key: group.key,
			entries: group.entries.slice(),
		});
	}

	for (const tag of pinnedTags) {
		const parsedTag = parseTaskTag(tag);
		const lookupKey = getTagGroupLookupKey(parsedTag.key);
		const existingGroup = groupsByKey.get(lookupKey);
		const group = existingGroup ?? {
			key: parsedTag.key,
			entries: [],
		};

		if (!existingGroup) {
			groupsByKey.set(lookupKey, group);
		}

		if (group.entries.some((entry) => entry.tag === parsedTag.tag)) continue;

		group.entries.push({
			tag: parsedTag.tag,
			key: parsedTag.key,
			value: parsedTag.value,
			count: 0,
		});
	}

	return Array.from(groupsByKey.values())
		.sort((left, right) => compareTagGroupKeys(left.key, right.key))
		.map((group) => ({
			key: group.key,
			entries: group.entries.sort(compareTagFacetEntries),
		}));
}

function compareTagFacetEntries(
	left: ExplorerFacets['tagGroups'][number]['entries'][number],
	right: ExplorerFacets['tagGroups'][number]['entries'][number],
): number {
	//
	if (left.count !== right.count) return right.count - left.count;
	if (left.value !== right.value) return left.value.localeCompare(right.value);

	return left.tag.localeCompare(right.tag);
}

function findFacetCount(entries: ExplorerFacets['statuses'], value: string): number {
	//
	return entries.find((entry) => entry.value === value)?.count ?? 0;
}

function renderStatusIcon(status: string) {
	//
	if (status === 'inbox') return <Inbox className="size-3.5" />;
	if (status === 'ideas') return <Lightbulb className="size-3.5" />;
	if (status === 'active') return <CircleDot className="size-3.5" />;
	if (status === 'backlog') return <Archive className="size-3.5" />;
	if (status === 'references') return <Layers className="size-3.5" />;
	if (status === 'completed') return <CheckCircle2 className="size-3.5" />;

	return <AlertTriangle className="size-3.5 text-amber-300" />;
}

function getPriorityClassName(priority: string): string {
	//
	if (priority === 'critical') return 'bg-red-400/20 text-red-100';
	if (priority === 'high') return 'bg-orange-400/20 text-orange-100';
	if (priority === 'medium') return 'bg-yellow-400/20 text-yellow-100';
	if (priority === 'low') return 'bg-blue-400/20 text-blue-100';

	return 'bg-muted text-muted-foreground';
}

function getPriorityBorderClassName(priority: string | null): string {
	//
	if (priority === 'critical') return 'border-l-red-400';
	if (priority === 'high') return 'border-l-orange-400';
	if (priority === 'medium') return 'border-l-yellow-400';
	if (priority === 'low') return 'border-l-blue-400';

	return 'border-l-transparent';
}

function getTagClassName(tag: string): string {
	//
	const colorIndex = Array.from(tag).reduce((total, char) => total + char.charCodeAt(0), 0) % 6;

	if (colorIndex === 0) return 'bg-sky-400/15 text-sky-100';
	if (colorIndex === 1) return 'bg-emerald-400/15 text-emerald-100';
	if (colorIndex === 2) return 'bg-violet-400/15 text-violet-100';
	if (colorIndex === 3) return 'bg-amber-400/15 text-amber-100';
	if (colorIndex === 4) return 'bg-rose-400/15 text-rose-100';

	return 'bg-zinc-500/30 text-zinc-100';
}

function formatTaskDate(ms: number): string {
	//
	if (!Number.isFinite(ms)) return 'unknown';

	return new Date(ms).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
	});
}
