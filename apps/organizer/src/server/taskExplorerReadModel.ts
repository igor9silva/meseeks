import type { ExplorerQuery } from '~/server/taskExplorerSchemas';
import type { SnapshotResult } from '~/server/taskIndexRepository';
import type { TaskSummary } from '~/server/taskIndexSchemas';

type FacetEntry = {
	value: string;
	count: number;
};

type ExplorerFacets = {
	sources: FacetEntry[];
	statuses: FacetEntry[];
	tags: FacetEntry[];
};

const defaultSources: ExplorerQuery['sources'] = ['public', 'private'];

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

function normalizeQueryInput(input: ExplorerQuery): ExplorerQuery {
	//
	const normalizedSources = input.sources.length > 0 ? input.sources : defaultSources;
	const normalizedStatuses =
		input.statuses.length > 0 ? dedupeStrings(input.statuses) : ['active', 'backlog', 'inbox'];
	const normalizedTags = dedupeStrings(input.tags);
	const normalizedExcludedTags = dedupeStrings(input.excludedTags);

	return {
		q: input.q.trim(),
		sources: normalizedSources,
		statuses: normalizedStatuses,
		tags: normalizedTags,
		excludedTags: normalizedExcludedTags,
		rootsOnly: input.rootsOnly,
		sort: input.sort,
	};
}

function priorityRank(priority: string | null): number {
	//
	if (priority === null) return 4;

	const normalized = priority.toLowerCase();
	if (normalized === 'critical') return 0;
	if (normalized === 'high') return 1;
	if (normalized === 'medium') return 2;
	if (normalized === 'low') return 3;

	return 4;
}

function compareTasks(left: TaskSummary, right: TaskSummary, sort: ExplorerQuery['sort']): number {
	//
	if (sort === 'recency') {
		if (left.fileMtimeMs !== right.fileMtimeMs) {
			return right.fileMtimeMs - left.fileMtimeMs;
		}
		return left.title.localeCompare(right.title);
	}

	if (sort === 'title') {
		return left.title.localeCompare(right.title);
	}

	const leftPriority = priorityRank(left.priority);
	const rightPriority = priorityRank(right.priority);

	if (leftPriority !== rightPriority) return leftPriority - rightPriority;
	if (left.fileMtimeMs !== right.fileMtimeMs) {
		return right.fileMtimeMs - left.fileMtimeMs;
	}
	return left.title.localeCompare(right.title);
}

function calculateSearchScore(task: TaskSummary, tokens: string[]): number {
	//
	if (tokens.length === 0) return 0;

	const title = task.title.toLowerCase();
	const id = task.id.toLowerCase();
	const tags = task.tags.map((tag) => tag.toLowerCase());
	const body = task.bodySearch.toLowerCase();
	let totalScore = 0;

	for (const token of tokens) {
		let tokenScore = 0;

		if (id.includes(token)) tokenScore += 500;
		if (title.includes(token)) tokenScore += 350;
		if (tags.some((tag) => tag.includes(token))) tokenScore += 200;
		if (body.includes(token)) tokenScore += 60;

		totalScore += tokenScore;
	}

	return totalScore;
}

function matchesTaskFilters(
	task: TaskSummary,
	query: ExplorerQuery,
	searchTokens: string[],
	options: {
		includeSources: boolean;
		includeStatuses: boolean;
		includeTags: boolean;
		includeExcludedTags: boolean;
		includeSearch: boolean;
	},
): boolean {
	//
	if (query.rootsOnly && task.parentKey !== null) {
		return false;
	}

	if (options.includeSources && !query.sources.includes(task.taskSource)) {
		return false;
	}

	if (options.includeStatuses && !query.statuses.includes(task.status)) {
		return false;
	}

	if (options.includeTags && query.tags.length > 0) {
		const hasMatchingTag = task.tags.some((tag) => query.tags.includes(tag));
		if (!hasMatchingTag) return false;
	}

	if (options.includeExcludedTags && query.excludedTags.length > 0) {
		const hasExcludedTag = task.tags.some((tag) => query.excludedTags.includes(tag));
		if (hasExcludedTag) return false;
	}

	if (options.includeSearch && searchTokens.length > 0) {
		const score = calculateSearchScore(task, searchTokens);
		if (score <= 0) return false;
	}

	return true;
}

function mapCountEntries(counts: Map<string, number>, sort: 'alpha' | 'count_then_alpha'): FacetEntry[] {
	//
	const entries = Array.from(counts.entries()).map(([value, count]) => ({
		value,
		count,
	}));

	if (sort === 'alpha') {
		return entries.sort((left, right) => left.value.localeCompare(right.value));
	}

	return entries.sort((left, right) => {
		if (left.count !== right.count) return right.count - left.count;
		return left.value.localeCompare(right.value);
	});
}

function buildFacets(tasks: TaskSummary[], query: ExplorerQuery, searchTokens: string[]): ExplorerFacets {
	//
	const sourceCounts = new Map<string, number>();
	const statusCounts = new Map<string, number>();
	const tagCounts = new Map<string, number>();

	for (const task of tasks) {
		if (
			matchesTaskFilters(task, query, searchTokens, {
				includeSources: false,
				includeStatuses: true,
				includeTags: true,
				includeExcludedTags: true,
				includeSearch: true,
			})
		) {
			sourceCounts.set(task.taskSource, (sourceCounts.get(task.taskSource) ?? 0) + 1);
		}

		if (
			matchesTaskFilters(task, query, searchTokens, {
				includeSources: true,
				includeStatuses: false,
				includeTags: true,
				includeExcludedTags: true,
				includeSearch: true,
			})
		) {
			statusCounts.set(task.status, (statusCounts.get(task.status) ?? 0) + 1);
		}

		if (
			matchesTaskFilters(task, query, searchTokens, {
				includeSources: true,
				includeStatuses: true,
				includeTags: false,
				includeExcludedTags: false,
				includeSearch: true,
			})
		) {
			for (const tag of task.tags) {
				tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
			}
		}
	}

	return {
		sources: mapCountEntries(sourceCounts, 'alpha'),
		statuses: mapCountEntries(statusCounts, 'alpha'),
		tags: mapCountEntries(tagCounts, 'count_then_alpha'),
	};
}

function buildStatusOptions(tasks: TaskSummary[]): string[] {
	//
	const statuses = new Set<string>();

	for (const task of tasks) {
		statuses.add(task.status);
	}

	return Array.from(statuses).sort((left, right) => left.localeCompare(right));
}

export function createTaskLookup(tasks: TaskSummary[]): Map<string, TaskSummary> {
	//
	const taskByKey = new Map<string, TaskSummary>();

	for (const task of tasks) {
		taskByKey.set(task.key, task);
	}

	return taskByKey;
}

export function buildExplorerSnapshot(snapshotResult: SnapshotResult, input: ExplorerQuery) {
	//
	if (!snapshotResult.health.isReady || snapshotResult.snapshot === null) {
		return {
			health: snapshotResult.health,
			tasks: [],
			facets: {
				sources: [],
				statuses: [],
				tags: [],
			},
			totals: {
				all: 0,
				visible: 0,
			},
			statusOptions: [],
			query: normalizeQueryInput(input),
		};
	}

	const normalizedQuery = normalizeQueryInput(input);
	const searchTokens = normalizedQuery.q
		.toLowerCase()
		.split(/\s+/)
		.map((token) => token.trim())
		.filter((token) => token.length > 0);

	const scoredTasks: Array<{ task: TaskSummary; score: number }> = [];

	for (const task of snapshotResult.snapshot.meta.tasks) {
		if (
			!matchesTaskFilters(task, normalizedQuery, searchTokens, {
				includeSources: true,
				includeStatuses: true,
				includeTags: true,
				includeExcludedTags: true,
				includeSearch: false,
			})
		) {
			continue;
		}

		const score = calculateSearchScore(task, searchTokens);

		if (searchTokens.length > 0 && score <= 0) continue;

		scoredTasks.push({ task, score });
	}

	scoredTasks.sort((left, right) => {
		if (searchTokens.length > 0 && left.score !== right.score) {
			return right.score - left.score;
		}
		return compareTasks(left.task, right.task, normalizedQuery.sort);
	});

	const tasks = scoredTasks.map(({ task, score }) => ({
		key: task.key,
		id: task.id,
		title: task.title,
		taskSource: task.taskSource,
		status: task.status,
		priority: task.priority,
		tags: task.tags,
		bodyExcerpt: task.bodyExcerpt,
		relativePath: task.relativePath,
		fileMtimeMs: task.fileMtimeMs,
		warningCount: task.warnings.length,
		score,
	}));

	return {
		health: snapshotResult.health,
		tasks,
		facets: buildFacets(snapshotResult.snapshot.meta.tasks, normalizedQuery, searchTokens),
		totals: {
			all: snapshotResult.snapshot.meta.tasks.length,
			visible: tasks.length,
		},
		statusOptions: buildStatusOptions(snapshotResult.snapshot.meta.tasks),
		query: normalizedQuery,
	};
}

export function buildTaskDetail(snapshotResult: SnapshotResult, taskKey: string) {
	//
	if (!snapshotResult.health.isReady || snapshotResult.snapshot === null) {
		return {
			health: snapshotResult.health,
			task: null,
			relations: {
				parentKey: null,
				children: [],
			},
		};
	}

	const taskByKey = createTaskLookup(snapshotResult.snapshot.meta.tasks);
	const task = taskByKey.get(taskKey) ?? null;

	if (!task) {
		return {
			health: snapshotResult.health,
			task: null,
			relations: {
				parentKey: null,
				children: [],
			},
		};
	}

	const contentEntry = snapshotResult.snapshot.content.entries.find((entry) => entry.key === task.key) ?? null;
	const graphEdges = snapshotResult.snapshot.graph.edges;

	const parentEdge = graphEdges.find(
		(edge) => edge.type === 'parent' && edge.from === task.key && edge.resolved && edge.to !== null,
	);

	const childKeys = graphEdges
		.filter((edge) => edge.type === 'parent' && edge.to === task.key && edge.resolved)
		.map((edge) => edge.from);

	const parentKey = parentEdge?.to ?? null;

	const relationKeys = dedupeStrings([...(parentKey ? [parentKey] : []), ...childKeys]);

	const relatedTasks = relationKeys
		.map((key) => taskByKey.get(key))
		.filter((value): value is TaskSummary => value !== undefined)
		.map((relatedTask) => ({
			key: relatedTask.key,
			id: relatedTask.id,
			title: relatedTask.title,
			status: relatedTask.status,
			taskSource: relatedTask.taskSource,
		}));

	const absolutePath = typeof task.absolutePath === 'string' ? task.absolutePath : null;

	return {
		health: snapshotResult.health,
		task: {
			key: task.key,
			id: task.id,
			title: task.title,
			status: task.status,
			priority: task.priority,
			taskSource: task.taskSource,
			tags: task.tags,
			relativePath: task.relativePath,
			absolutePath,
			parentId: task.parentId,
			parentKey: task.parentKey,
			created: task.created,
			updated: task.updated,
			source: task.source,
			warnings: task.warnings,
			body: contentEntry?.body ?? '',
			rawFrontmatter: contentEntry?.rawFrontmatter ?? null,
		},
		relations: {
			parentKey,
			children: childKeys,
		},
		relatedTasks,
	};
}
