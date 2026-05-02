import { Link } from "@tanstack/react-router";
import { Lock, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	type ExplorerQueryInput,
	type ExplorerSort,
	explorerSortSchema,
	type TaskSource,
} from "~/lib/explorerSearchParams";
import { cn } from "~/lib/utils";
import type {
	ExplorerFacets,
	ExplorerHealth,
	ExplorerTask,
	ExplorerTotals,
} from "./taskExplorerTypes";
import { formatSourceLabel, taskSourceOptions } from "./taskExplorerUtils";

export function TaskExplorerSidebar({
	queryInput,
	searchDraft,
	selectedTaskKey,
	shouldShowIndexUnavailable,
	health,
	visibleTasks,
	facets,
	totals,
	isPending,
	searchInputId,
	onSearchDraftChange,
	onCreateTaskOpen,
	onSourceToggle,
	onStatusToggle,
	onTagToggle,
	onExcludedTagToggle,
	onRootsOnlyToggle,
	onSortChange,
	onTaskSelect,
}: {
	queryInput: ExplorerQueryInput;
	searchDraft: string;
	selectedTaskKey: string | null;
	shouldShowIndexUnavailable: boolean;
	health: ExplorerHealth | undefined;
	visibleTasks: ExplorerTask[];
	facets: ExplorerFacets | undefined;
	totals: ExplorerTotals | undefined;
	isPending: boolean;
	searchInputId: string;
	onSearchDraftChange: (value: string) => void;
	onCreateTaskOpen: () => void;
	onSourceToggle: (source: TaskSource) => void;
	onStatusToggle: (status: string) => void;
	onTagToggle: (tag: string) => void;
	onExcludedTagToggle: (tag: string) => void;
	onRootsOnlyToggle: () => void;
	onSortChange: (sort: ExplorerSort) => void;
	onTaskSelect: () => void;
}) {
	//
	const tagEntries = buildTagEntries(
		facets?.tags ?? [],
		queryInput.tags.concat(queryInput.excludedTags),
	);

	return (
		<section className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
			<header className="space-y-3 border-b border-border p-3">
				<div className="flex items-center justify-between gap-2">
					<h1 className="text-lg font-semibold">Organizer</h1>
					<Button
						type="button"
						size="sm"
						variant="secondary"
						onClick={onCreateTaskOpen}
					>
						<Plus className="size-4" />
						New
					</Button>
				</div>

				{shouldShowIndexUnavailable && (
					<div className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm">
						<div className="font-medium text-destructive">
							Task indexes are unavailable.
						</div>
						{health?.errors.map((error) => (
							<div key={error} className="break-words text-destructive/90">
								{error}
							</div>
						))}
						{health?.generatedDir && (
							<div className="mt-1 text-muted-foreground">
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
						onChange={(event) => onSearchDraftChange(event.currentTarget.value)}
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
									facets?.sources.find((entry) => entry.value === source)
										?.count ?? 0;

								return (
									<label
										key={source}
										className="flex cursor-pointer items-center justify-between gap-2 text-sm"
									>
										<span className="flex items-center gap-2">
											<input
												type="checkbox"
												className="cursor-pointer"
												checked={isSelected}
												onChange={() => onSourceToggle(source)}
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
								const parsedSort = explorerSortSchema.safeParse(
									event.currentTarget.value,
								);
								if (!parsedSort.success) return;
								onSortChange(parsedSort.data);
							}}
							className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-2 text-sm"
						>
							<option value="priority_then_recency">
								priority then recency
							</option>
							<option value="recency">recency</option>
							<option value="title">title A-Z</option>
						</select>
					</div>
				</div>

				<label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
					<span className="font-medium">Root tasks only</span>
					<input
						type="checkbox"
						className="cursor-pointer"
						checked={queryInput.rootsOnly}
						onChange={onRootsOnlyToggle}
					/>
				</label>

				<div className="space-y-2">
					<div className="text-sm font-medium">Statuses</div>
					<div className="flex flex-wrap gap-2">
						{(facets?.statuses ?? []).map((statusEntry) => {
							const isSelected = queryInput.statuses.includes(
								statusEntry.value,
							);
							return (
								<button
									key={statusEntry.value}
									type="button"
									onClick={() => onStatusToggle(statusEntry.value)}
									className={cn(
										"cursor-pointer rounded-md border px-2 py-1 text-xs",
										isSelected
											? "border-primary bg-primary text-primary-foreground"
											: "border-border bg-background text-foreground",
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
					<div className="flex max-h-24 flex-wrap gap-2 overflow-auto">
						{tagEntries.map((tagEntry) => {
							const isSelected = queryInput.tags.includes(tagEntry.value);

							return (
								<button
									key={tagEntry.value}
									type="button"
									onClick={() => onTagToggle(tagEntry.value)}
									className={cn(
										"cursor-pointer rounded-md border px-2 py-1 text-xs",
										isSelected
											? "border-secondary bg-secondary text-secondary-foreground"
											: "border-border bg-background text-foreground",
									)}
								>
									{tagEntry.value} ({tagEntry.count})
								</button>
							);
						})}
					</div>
				</div>

				<div className="space-y-2">
					<div className="text-sm font-medium">Exclude tags</div>
					<div className="flex max-h-24 flex-wrap gap-2 overflow-auto">
						{tagEntries.map((tagEntry) => {
							const isSelected = queryInput.excludedTags.includes(
								tagEntry.value,
							);

							return (
								<button
									key={tagEntry.value}
									type="button"
									onClick={() => onExcludedTagToggle(tagEntry.value)}
									className={cn(
										"cursor-pointer rounded-md border px-2 py-1 text-xs",
										isSelected
											? "border-destructive bg-destructive text-destructive-foreground"
											: "border-border bg-background text-foreground",
									)}
								>
									{tagEntry.value} ({tagEntry.count})
								</button>
							);
						})}
					</div>
				</div>

				<div className="text-xs text-muted-foreground">
					{totals?.visible ?? 0} visible / {totals?.all ?? 0} total
				</div>
			</header>

			<div className="flex-1 divide-y divide-border overflow-auto">
				{isPending && (
					<div className="p-3 text-sm text-muted-foreground">
						Loading tasks...
					</div>
				)}
				{!isPending && visibleTasks.length === 0 && (
					<div className="p-3 text-sm text-muted-foreground">
						No tasks match the current filters.
					</div>
				)}

				{visibleTasks.map((task) => (
					<Link
						key={task.key}
						from="/"
						to="/"
						onClick={onTaskSelect}
						search={(previous) => ({
							...previous,
							taskKey: task.key,
						})}
						className={cn(
							"block w-full cursor-pointer p-3 text-left transition-colors hover:bg-muted/50",
							selectedTaskKey === task.key && "bg-muted",
						)}
					>
						<div className="flex items-start justify-between gap-2">
							<div className="text-sm font-medium">{task.title}</div>
							{task.taskSource === "private" ? (
								<Lock
									className="h-3.5 w-3.5 text-muted-foreground"
									aria-label="Private task"
								/>
							) : null}
						</div>

						<div className="mt-1 break-all text-xs text-muted-foreground">
							{task.id}
						</div>

						<div className="mt-2 flex flex-wrap gap-1">
							<span className="rounded border border-border px-1.5 py-0.5 text-xs">
								{task.status}
							</span>
							{task.priority && (
								<span className="rounded border border-border px-1.5 py-0.5 text-xs">
									{task.priority}
								</span>
							)}
						</div>

						{task.tags.length > 0 && (
							<div className="mt-2 flex flex-wrap gap-1">
								{task.tags.slice(0, 6).map((tag) => (
									<span
										key={tag}
										className="rounded bg-muted px-1.5 py-0.5 text-xs"
									>
										#{tag}
									</span>
								))}
							</div>
						)}
					</Link>
				))}
			</div>
		</section>
	);
}

function buildTagEntries(
	facetEntries: ExplorerFacets["tags"],
	pinnedTags: string[],
): ExplorerFacets["tags"] {
	//
	const entryByValue = new Map<string, ExplorerFacets["tags"][number]>();

	for (const entry of facetEntries) {
		entryByValue.set(entry.value, entry);
	}

	for (const tag of pinnedTags) {
		if (entryByValue.has(tag)) continue;
		entryByValue.set(tag, { value: tag, count: 0 });
	}

	return Array.from(entryByValue.values()).sort((left, right) => {
		if (left.count !== right.count) return right.count - left.count;
		return left.value.localeCompare(right.value);
	});
}
