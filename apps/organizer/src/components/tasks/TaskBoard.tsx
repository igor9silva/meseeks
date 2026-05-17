import { Badge, Input, Tabs, TabsList, TabsTrigger, cn } from '@reactor/ui';
import {
	AlertTriangle,
	ArrowRight,
	Archive,
	CircleDot,
	Inbox,
	Layers,
	Lightbulb,
	List,
	Lock,
	Maximize2,
	Minimize2,
	Search,
	SquareKanban,
} from 'lucide-react';
import { type ExplorerQueryInput, type ExplorerSort, explorerSortSchema } from '~/lib/explorerSearchParams';
import { compareTagGroupKeys, formatTagGroupLabel, getTagGroupLookupKey, parseTaskTag } from '~/lib/taskTags';
import type { TaskConfig } from '~/server/taskIndexSchemas';
import type { ExplorerFacets, ExplorerHealth, ExplorerTask, ExplorerTotals, TaskDetailTask } from './taskExplorerTypes';
import { getTaskDisplayFilename } from './taskExplorerUtils';

export function TaskBoard({
	className,
	currentTask,
	globalView,
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
	onTaskSelect,
	onTaskOpen,
	onViewChange,
	onExpandedToggle,
}: {
	className?: string;
	currentTask: TaskDetailTask | null;
	globalView: TaskConfig['view'];
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
	onTaskSelect: (task: ExplorerTask) => void;
	onTaskOpen: (task: ExplorerTask) => void;
	onViewChange: (view: TaskConfig['view']) => void;
	onExpandedToggle: () => void;
}) {
	//
	const config = currentTask?.config ?? createGlobalConfig(globalView);
	const tagGroups = buildTagGroups(facets?.tagGroups ?? [], queryInput.tags.concat(queryInput.excludedTags));
	const shouldRenderBoard = config.view === 'board';
	const displayTasks = applyHiddenTags(visibleTasks, config.hiddenTags, queryInput.tags);

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
							<h2 className="text-lg font-semibold">Subtasks</h2>
							<span className="text-xs text-muted-foreground">
								{totals?.visible ?? 0} visible / {totals?.all ?? 0} indexed
							</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							aria-label={isExpanded ? 'Collapse subtasks panel' : 'Expand subtasks panel'}
							title={isExpanded ? 'Collapse subtasks panel' : 'Expand subtasks panel'}
							onClick={onExpandedToggle}
							className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-background text-foreground/80 hover:border-foreground/40 hover:text-foreground"
						>
							{isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
						</button>
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
							placeholder="Search title, path, tags, body"
							className="h-9 rounded-md pl-8"
						/>
					</div>

					<div className="flex shrink-0 flex-wrap items-center gap-1">
						<ViewTabs currentView={config.view} onViewChange={onViewChange} />

						<DepthRangeControl
							minDepth={queryInput.minDepth}
							maxDepth={queryInput.maxDepth}
							onDepthRangeChange={onDepthRangeChange}
						/>

						<select
							value={queryInput.sort}
							onChange={(event) => {
								const parsedSort = explorerSortSchema.safeParse(event.currentTarget.value);
								if (!parsedSort.success) return;
								onSortChange(parsedSort.data);
							}}
							className="h-8 rounded-md border border-input bg-background px-2 text-xs"
						>
							<option value="priority_then_recency">Priority</option>
							<option value="recency">Recent</option>
							<option value="title">Title</option>
						</select>
					</div>
				</div>

				{tagGroups.length > 0 ? (
					<div className="h-32 min-h-12 max-h-80 resize-y space-y-2 overflow-auto border-t border-border/80 px-3 py-2">
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
			</header>

			<div className="min-h-0 flex-1 overflow-auto">
				{isPending ? <div className="px-3 py-4 text-sm text-muted-foreground">Loading tasks...</div> : null}
				{!isPending && visibleTasks.length === 0 ? (
					<div className="px-3 py-4 text-sm text-muted-foreground">
						{totals?.directChildren === 0 ? 'This task has no subtasks.' : 'No tasks match this view.'}
					</div>
				) : null}

				{shouldRenderBoard ? (
					<BoardView
						config={config}
						tasks={displayTasks}
						selectedTaskKey={selectedTaskKey}
						shouldBlurPrivateTasks={shouldBlurPrivateTasks}
						onTaskSelect={onTaskSelect}
						onTaskOpen={onTaskOpen}
					/>
				) : (
					<ListView
						tasks={displayTasks}
						selectedTaskKey={selectedTaskKey}
						shouldBlurPrivateTasks={shouldBlurPrivateTasks}
						onTaskSelect={onTaskSelect}
						onTaskOpen={onTaskOpen}
					/>
				)}
			</div>
		</section>
	);
}

function createGlobalConfig(view: TaskConfig['view'] = 'list'): TaskConfig {
	//
	return {
		view,
		scope: 'direct',
		columns:
			view === 'board'
				? [
						{
							id: 'backlog',
							label: 'Backlog',
							tag: 'status:backlog',
						},
						{
							id: 'active',
							label: 'Active',
							tag: 'status:active',
						},
					]
				: [],
		hiddenTags: ['status:completed'],
	};
}

function ViewTabs({
	currentView,
	onViewChange,
}: {
	currentView: TaskConfig['view'];
	onViewChange: (view: TaskConfig['view']) => void;
}) {
	//
	return (
		<Tabs value={currentView} onValueChange={(value) => onViewChange(value === 'board' ? 'board' : 'list')}>
			<TabsList className="h-8 rounded-full">
				<TabsTrigger
					value="list"
					className="h-6 gap-1 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
				>
					<List className="size-3.5" />
					List
				</TabsTrigger>
				<TabsTrigger
					value="board"
					className="h-6 gap-1 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
				>
					<SquareKanban className="size-3.5" />
					Board
				</TabsTrigger>
			</TabsList>
		</Tabs>
	);
}

function DepthRangeControl({
	minDepth,
	maxDepth,
	onDepthRangeChange,
}: {
	minDepth: number;
	maxDepth: number;
	onDepthRangeChange: (minDepth: number, maxDepth: number) => void;
}) {
	//
	const depthOptions = Array.from({ length: 16 }, (_, index) => index + 1);

	return (
		<div className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground">
			<span>Depth</span>
			<select
				aria-label="Minimum depth"
				value={minDepth}
				onChange={(event) => {
					const nextMinDepth = Number(event.currentTarget.value);
					onDepthRangeChange(nextMinDepth, Math.max(nextMinDepth, maxDepth));
				}}
				className="h-6 rounded bg-transparent text-foreground outline-none"
			>
				{depthOptions.map((depth) => (
					<option key={depth} value={depth}>
						{depth}
					</option>
				))}
			</select>
			<span className="text-muted-foreground/70">-</span>
			<select
				aria-label="Maximum depth"
				value={maxDepth}
				onChange={(event) => {
					const nextMaxDepth = Number(event.currentTarget.value);
					onDepthRangeChange(Math.min(minDepth, nextMaxDepth), nextMaxDepth);
				}}
				className="h-6 rounded bg-transparent text-foreground outline-none"
			>
				{depthOptions.map((depth) => (
					<option key={depth} value={depth}>
						{depth}
					</option>
				))}
			</select>
		</div>
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

function BoardView({
	config,
	tasks,
	selectedTaskKey,
	shouldBlurPrivateTasks,
	onTaskSelect,
	onTaskOpen,
}: {
	config: TaskConfig;
	tasks: ExplorerTask[];
	selectedTaskKey: string | null;
	shouldBlurPrivateTasks: boolean;
	onTaskSelect: (task: ExplorerTask) => void;
	onTaskOpen: (task: ExplorerTask) => void;
}) {
	//
	const tasksByColumn = groupTasksByConfig(tasks, config);

	return (
		<div className="flex min-h-full min-w-0 border-t border-border/80">
			{config.columns.map((column) => (
				<TaskColumn
					key={column.id}
					title={column.label}
					tasks={tasksByColumn.get(column.id) ?? []}
					selectedTaskKey={selectedTaskKey}
					shouldBlurPrivateTasks={shouldBlurPrivateTasks}
					onTaskSelect={onTaskSelect}
					onTaskOpen={onTaskOpen}
				/>
			))}
			<TaskColumn
				title="Unsorted"
				tasks={tasksByColumn.get('unsorted') ?? []}
				selectedTaskKey={selectedTaskKey}
				shouldBlurPrivateTasks={shouldBlurPrivateTasks}
				onTaskSelect={onTaskSelect}
				onTaskOpen={onTaskOpen}
			/>
		</div>
	);
}

function ListView({
	tasks,
	selectedTaskKey,
	shouldBlurPrivateTasks,
	onTaskSelect,
	onTaskOpen,
}: {
	tasks: ExplorerTask[];
	selectedTaskKey: string | null;
	shouldBlurPrivateTasks: boolean;
	onTaskSelect: (task: ExplorerTask) => void;
	onTaskOpen: (task: ExplorerTask) => void;
}) {
	//
	return (
		<div className="divide-y divide-border/80 border-t border-border/80">
			{tasks.map((task) => (
				<TaskRow
					key={task.key}
					task={task}
					isSelected={selectedTaskKey === task.key}
					shouldBlurPrivateTasks={shouldBlurPrivateTasks}
					onTaskSelect={onTaskSelect}
					onTaskOpen={onTaskOpen}
				/>
			))}
		</div>
	);
}

function TaskColumn({
	title,
	tasks,
	selectedTaskKey,
	shouldBlurPrivateTasks,
	onTaskSelect,
	onTaskOpen,
}: {
	title: string;
	tasks: ExplorerTask[];
	selectedTaskKey: string | null;
	shouldBlurPrivateTasks: boolean;
	onTaskSelect: (task: ExplorerTask) => void;
	onTaskOpen: (task: ExplorerTask) => void;
}) {
	//
	return (
		<section className="min-h-64 min-w-72 flex-1 border-b border-r border-border/80 last:border-r-0 sm:border-b-0">
			<header className="sticky top-0 z-10 border-b border-border/80 bg-card/95 px-3 py-2">
				<div className="flex items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2">
						<h2 className="truncate text-sm font-semibold">{title}</h2>
					</div>
					<Badge variant="outline" className="shrink-0 rounded-md px-1.5 py-0 text-xs tabular-nums">
						{tasks.length}
					</Badge>
				</div>
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
						onTaskOpen={onTaskOpen}
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
	onTaskOpen,
}: {
	task: ExplorerTask;
	isSelected: boolean;
	shouldBlurPrivateTasks: boolean;
	onTaskSelect: (task: ExplorerTask) => void;
	onTaskOpen: (task: ExplorerTask) => void;
}) {
	//
	const shouldBlurTask = shouldBlurPrivateTasks && task.taskSource === 'private';

	return (
		<button
			type="button"
			onClick={() => onTaskSelect(task)}
			className={cn(
				'block min-h-24 w-full cursor-pointer border-l-2 px-3 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
				getPriorityBorderClassName(task.priority),
				isSelected && 'bg-muted',
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className={cn('min-w-0 flex-1', getPrivateBlurClassName(shouldBlurTask))}>
					<div className="flex min-w-0 items-start gap-1.5">
						<div className="mt-0.5 shrink-0">{renderSectionIcon(task.section)}</div>
						<div className="min-w-0 flex-1 break-words text-sm font-medium leading-5 text-foreground">
							{task.title}
						</div>
						{task.warningCount > 0 ? (
							<AlertTriangle
								className="mt-0.5 size-3.5 shrink-0 text-amber-300"
								aria-label={`${task.warningCount} warnings`}
							/>
						) : null}
						<button
							type="button"
							aria-label={`Navigate into ${task.title}`}
							title="Navigate into task"
							onClick={(event) => {
								event.stopPropagation();
								onTaskOpen(task);
							}}
							className="-mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
						>
							<ArrowRight className="size-5" />
						</button>
					</div>

					<div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
						<span className="break-all text-foreground/85">
							{getTaskDisplayFilename(task.relativePath)}
						</span>
						<span>{formatTaskDate(task.fileMtimeMs)}</span>
						{task.priority ? (
							<span className={cn('rounded px-1', getPriorityClassName(task.priority))}>
								{task.priority}
							</span>
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
					{task.taskSource === 'private' ? (
						<Lock className="size-3.5 text-muted-foreground" aria-label="Private task" />
					) : null}
				</div>
			</div>
		</button>
	);
}

function getPrivateBlurClassName(shouldBlur: boolean): string {
	//
	return shouldBlur ? 'select-none blur-xs' : '';
}

function applyHiddenTags(tasks: ExplorerTask[], hiddenTags: string[], includedTags: string[]): ExplorerTask[] {
	//
	if (hiddenTags.length === 0) return tasks;

	return tasks.filter((task) => {
		for (const hiddenTag of hiddenTags) {
			if (includedTags.includes(hiddenTag)) continue;
			if (task.tags.includes(hiddenTag)) return false;
		}

		return true;
	});
}

function groupTasksByConfig(tasks: ExplorerTask[], config: TaskConfig): Map<string, ExplorerTask[]> {
	//
	const tasksByColumn = new Map<string, ExplorerTask[]>();

	for (const column of config.columns) {
		tasksByColumn.set(column.id, []);
	}

	tasksByColumn.set('unsorted', []);

	for (const task of tasks) {
		const matchingColumn = config.columns.find((column) => column.tag !== null && task.tags.includes(column.tag));
		const columnId = matchingColumn?.id ?? 'unsorted';
		const columnTasks = tasksByColumn.get(columnId);

		if (!columnTasks) {
			tasksByColumn.set(columnId, [task]);
			continue;
		}

		columnTasks.push(task);
	}

	return tasksByColumn;
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

function renderSectionIcon(section: string) {
	//
	if (section === 'inbox') return <Inbox className="size-3.5 text-muted-foreground" />;
	if (section === 'ideas') return <Lightbulb className="size-3.5 text-muted-foreground" />;
	if (section === 'tasks') return <CircleDot className="size-3.5 text-muted-foreground" />;
	if (section === 'references') return <Layers className="size-3.5 text-muted-foreground" />;

	return <Archive className="size-3.5 text-muted-foreground" />;
}

function getPriorityBorderClassName(priority: string | null): string {
	//
	if (priority === 'critical') return 'border-l-red-500';
	if (priority === 'high') return 'border-l-orange-400';
	if (priority === 'medium') return 'border-l-yellow-400';
	if (priority === 'low') return 'border-l-blue-400';

	return 'border-l-transparent';
}

function getPriorityClassName(priority: string): string {
	//
	if (priority === 'critical') return 'bg-red-500/20 text-red-100';
	if (priority === 'high') return 'bg-orange-500/20 text-orange-100';
	if (priority === 'medium') return 'bg-yellow-500/20 text-yellow-100';
	if (priority === 'low') return 'bg-blue-500/20 text-blue-100';

	return 'bg-muted text-muted-foreground';
}

function getTagClassName(tag: string): string {
	//
	if (tag.startsWith('status:')) return 'bg-sky-500/20 text-sky-100';
	if (tag.startsWith('source:')) return 'bg-yellow-500/20 text-yellow-100';
	if (tag.startsWith('ticktick-')) return 'bg-violet-500/20 text-violet-100';
	if (tag === 'security') return 'bg-red-500/20 text-red-100';
	if (tag === 'ux') return 'bg-cyan-500/20 text-cyan-100';
	if (tag === 'tech') return 'bg-emerald-500/20 text-emerald-100';

	return 'bg-muted text-muted-foreground';
}

function formatTaskDate(epochMs: number): string {
	//
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
	}).format(new Date(epochMs));
}
