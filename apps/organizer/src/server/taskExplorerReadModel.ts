import type { ExplorerQuery } from '~/server/taskExplorerSchemas';
import type { SnapshotResult } from '~/server/taskIndexRepository';
import type { TaskSummary } from '~/server/taskIndexSchemas';
import { ROOT_PARENT_KEY } from '~/lib/explorerSearchParams';
import { compareTagGroupKeys, parseTaskTag } from '~/lib/taskTags';

type FacetEntry = {
	value: string;
	count: number;
};

type TagFacetEntry = {
	tag: string;
	key: string | null;
	value: string;
	count: number;
};

type TagFacetGroup = {
	key: string | null;
	entries: TagFacetEntry[];
};

type ExplorerFacets = {
	sources: FacetEntry[];
	statuses: FacetEntry[];
	sections: FacetEntry[];
	tags: FacetEntry[];
	tagGroups: TagFacetGroup[];
};

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
	return {
		q: input.q.trim(),
		sources: input.sources.length > 0 ? input.sources : [],
		tags: dedupeStrings(input.tags),
		excludedTags: dedupeStrings(input.excludedTags),
		parentKey: input.parentKey,
		minDepth: Math.min(input.minDepth, input.maxDepth),
		maxDepth: Math.max(input.minDepth, input.maxDepth),
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

function compareNavigationChildren(left: TaskSummary, right: TaskSummary, parentKey: string | null): number {
	//
	if (parentKey === ROOT_PARENT_KEY) {
		const leftRank = left.taskSource === 'public' ? 0 : 1;
		const rightRank = right.taskSource === 'public' ? 0 : 1;
		return leftRank - rightRank;
	}

	if (parentKey === null || !parentKey.endsWith(':')) return 0;
	if (left.pathSegments.length !== 1 || right.pathSegments.length !== 1) return 0;

	const order = ['inbox', 'tasks', 'references', 'ideas'];
	const leftRank = order.indexOf(left.pathSegments[0] ?? '');
	const rightRank = order.indexOf(right.pathSegments[0] ?? '');

	if (leftRank === -1 || rightRank === -1) return 0;
	return leftRank - rightRank;
}

function calculateSearchScore(task: TaskSummary, tokens: string[]): number {
	//
	if (tokens.length === 0) return 0;

	const title = task.title.toLowerCase();
	const id = task.id.toLowerCase();
	const taskPath = task.taskPath.toLowerCase();
	const tags = task.tags.map((tag) => tag.toLowerCase());
	const body = task.bodySearch.toLowerCase();
	let totalScore = 0;

	for (const token of tokens) {
		let tokenScore = 0;

		if (taskPath.includes(token)) tokenScore += 650;
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
	childKeySet: Set<string> | null,
	options: {
		includeSources: boolean;
		includeTags: boolean;
		includeExcludedTags: boolean;
		includeSearch: boolean;
		includeParent: boolean;
	},
): boolean {
	//
	if (options.includeParent && childKeySet !== null && !childKeySet.has(task.key)) {
		return false;
	}

	if (options.includeSources && !query.sources.includes(task.taskSource)) {
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

type TagCountEntry = {
	tag: string;
	key: string | null;
	value: string;
	count: number;
};

function getTaskTagDetails(task: TaskSummary) {
	//
	if (task.tagDetails.length > 0) return task.tagDetails;

	return task.tags.map((tag) => parseTaskTag(tag));
}

function addTagCount(counts: Map<string, TagCountEntry>, tagDetail: TaskSummary['tagDetails'][number]): void {
	//
	const existingEntry = counts.get(tagDetail.tag);

	if (existingEntry) {
		existingEntry.count += 1;
		return;
	}

	counts.set(tagDetail.tag, {
		tag: tagDetail.tag,
		key: tagDetail.key,
		value: tagDetail.value,
		count: 1,
	});
}

function mapTagCountEntries(counts: Map<string, TagCountEntry>): FacetEntry[] {
	//
	return Array.from(counts.values())
		.map((entry) => ({
			value: entry.tag,
			count: entry.count,
		}))
		.sort((left, right) => {
			if (left.count !== right.count) return right.count - left.count;
			return left.value.localeCompare(right.value);
		});
}

function buildTagFacetGroups(counts: Map<string, TagCountEntry>): TagFacetGroup[] {
	//
	const groupsByKey = new Map<string, TagFacetGroup>();

	for (const entry of counts.values()) {
		const lookupKey = entry.key ?? '';
		const existingGroup = groupsByKey.get(lookupKey);
		const group = existingGroup ?? {
			key: entry.key,
			entries: [],
		};

		if (!existingGroup) {
			groupsByKey.set(lookupKey, group);
		}

		group.entries.push({
			tag: entry.tag,
			key: entry.key,
			value: entry.value,
			count: entry.count,
		});
	}

	return Array.from(groupsByKey.values())
		.sort((left, right) => compareTagGroupKeys(left.key, right.key))
		.map((group) => ({
			key: group.key,
			entries: group.entries.sort(compareTagFacetEntries),
		}));
}

function compareTagFacetEntries(left: TagFacetEntry, right: TagFacetEntry): number {
	//
	if (left.count !== right.count) return right.count - left.count;
	if (left.value !== right.value) return left.value.localeCompare(right.value);

	return left.tag.localeCompare(right.tag);
}

function getDirectChildKeys(snapshotResult: SnapshotResult, parentKey: string | null): string[] {
	//
	if (parentKey === null || snapshotResult.snapshot === null) return [];

	if (parentKey === ROOT_PARENT_KEY) {
		return snapshotResult.snapshot.meta.tasks.filter((task) => task.taskPath.length === 0).map((task) => task.key);
	}

	return snapshotResult.snapshot.graph.edges
		.filter((edge) => edge.type === 'parent' && edge.to === parentKey && edge.resolved)
		.map((edge) => edge.from);
}

function buildChildKeySet(
	snapshotResult: SnapshotResult,
	parentKey: string | null,
	minDepth: number,
	maxDepth: number,
): Set<string> | null {
	//
	if (parentKey === null || snapshotResult.snapshot === null) return null;

	const includedKeys = new Set<string>();
	let currentKeys = getDirectChildKeys(snapshotResult, parentKey);
	let currentDepth = 1;

	while (currentDepth <= maxDepth && currentKeys.length > 0) {
		const nextKeys: string[] = [];

		for (const key of currentKeys) {
			if (currentDepth >= minDepth) {
				includedKeys.add(key);
			}
			nextKeys.push(...getDirectChildKeys(snapshotResult, key));
		}

		currentKeys = nextKeys;
		currentDepth += 1;
	}

	return includedKeys;
}

function buildHierarchyRanks(
	snapshotResult: SnapshotResult,
	parentKey: string | null,
	minDepth: number,
	maxDepth: number,
	sort: ExplorerQuery['sort'],
): Map<string, number> | null {
	//
	if (parentKey === null || snapshotResult.snapshot === null) return null;

	const taskByKey = createTaskLookup(snapshotResult.snapshot.meta.tasks);
	const ranks = new Map<string, number>();
	let nextRank = 0;

	const visit = (currentParentKey: string, currentDepth: number) => {
		if (currentDepth > maxDepth) return;

		const childTasks = getDirectChildKeys(snapshotResult, currentParentKey)
			.map((key) => taskByKey.get(key) ?? null)
			.filter((task): task is TaskSummary => task !== null)
			.sort((left, right) => {
				const navigationComparison = compareNavigationChildren(left, right, currentParentKey);
				if (navigationComparison !== 0) return navigationComparison;

				return compareTasks(left, right, sort);
			});

		for (const task of childTasks) {
			if (currentDepth >= minDepth) {
				ranks.set(task.key, nextRank);
				nextRank += 1;
			}
			visit(task.key, currentDepth + 1);
		}
	};

	visit(parentKey, 1);
	return ranks;
}

function buildFacets(
	tasks: TaskSummary[],
	query: ExplorerQuery,
	searchTokens: string[],
	childKeySet: Set<string> | null,
): ExplorerFacets {
	//
	const sourceCounts = new Map<string, number>();
	const statusCounts = new Map<string, number>();
	const sectionCounts = new Map<string, number>();
	const tagCounts = new Map<string, TagCountEntry>();

	for (const task of tasks) {
		if (
			matchesTaskFilters(task, query, searchTokens, childKeySet, {
				includeSources: false,
				includeTags: true,
				includeExcludedTags: true,
				includeSearch: true,
				includeParent: true,
			})
		) {
			sourceCounts.set(task.taskSource, (sourceCounts.get(task.taskSource) ?? 0) + 1);
		}

		if (
			matchesTaskFilters(task, query, searchTokens, childKeySet, {
				includeSources: true,
				includeTags: true,
				includeExcludedTags: true,
				includeSearch: true,
				includeParent: true,
			})
		) {
			statusCounts.set(task.status, (statusCounts.get(task.status) ?? 0) + 1);
			sectionCounts.set(task.section, (sectionCounts.get(task.section) ?? 0) + 1);
		}

		if (
			matchesTaskFilters(task, query, searchTokens, childKeySet, {
				includeSources: true,
				includeTags: false,
				includeExcludedTags: false,
				includeSearch: true,
				includeParent: true,
			})
		) {
			for (const tagDetail of getTaskTagDetails(task)) {
				addTagCount(tagCounts, tagDetail);
			}
		}
	}

	return {
		sources: mapCountEntries(sourceCounts, 'alpha'),
		statuses: mapCountEntries(statusCounts, 'alpha'),
		sections: mapCountEntries(sectionCounts, 'alpha'),
		tags: mapTagCountEntries(tagCounts),
		tagGroups: buildTagFacetGroups(tagCounts),
	};
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
				sections: [],
				tags: [],
				tagGroups: [],
			},
			totals: {
				all: 0,
				visible: 0,
				directChildren: 0,
			},
			tagOptions: [],
			query: normalizeQueryInput(input),
		};
	}

	const normalizedQuery = normalizeQueryInput(input);
	const directChildCount = getDirectChildKeys(snapshotResult, normalizedQuery.parentKey).length;
	const childKeySet = buildChildKeySet(
		snapshotResult,
		normalizedQuery.parentKey,
		normalizedQuery.minDepth,
		normalizedQuery.maxDepth,
	);
	const hierarchyRanks =
		normalizedQuery.q.length === 0
			? buildHierarchyRanks(
					snapshotResult,
					normalizedQuery.parentKey,
					normalizedQuery.minDepth,
					normalizedQuery.maxDepth,
					normalizedQuery.sort,
				)
			: null;
	const searchTokens = normalizedQuery.q
		.toLowerCase()
		.split(/\s+/)
		.map((token) => token.trim())
		.filter((token) => token.length > 0);

	const scoredTasks: Array<{ task: TaskSummary; score: number }> = [];

	for (const task of snapshotResult.snapshot.meta.tasks) {
		if (
			!matchesTaskFilters(task, normalizedQuery, searchTokens, childKeySet, {
				includeSources: true,
				includeTags: true,
				includeExcludedTags: true,
				includeSearch: false,
				includeParent: true,
			})
		) {
			continue;
		}

		const score = calculateSearchScore(task, searchTokens);

		if (searchTokens.length > 0 && score <= 0) continue;

		scoredTasks.push({ task, score });
	}

	scoredTasks.sort((left, right) => {
		if (hierarchyRanks !== null) {
			const leftRank = hierarchyRanks.get(left.task.key) ?? Number.MAX_SAFE_INTEGER;
			const rightRank = hierarchyRanks.get(right.task.key) ?? Number.MAX_SAFE_INTEGER;

			if (leftRank !== rightRank) return leftRank - rightRank;
		}

		const navigationComparison = compareNavigationChildren(left.task, right.task, normalizedQuery.parentKey);
		if (navigationComparison !== 0) return navigationComparison;

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
		section: task.section,
		taskPath: task.taskPath,
		pathSegments: task.pathSegments,
		config: task.config,
		priority: task.priority,
		tags: task.tags,
		bodyExcerpt: task.bodyExcerpt,
		relativePath: task.relativePath,
		absolutePath: task.absolutePath,
		fileMtimeMs: task.fileMtimeMs,
		warningCount: task.warnings.length,
		score,
	}));

	return {
		health: snapshotResult.health,
		tasks,
		facets: buildFacets(snapshotResult.snapshot.meta.tasks, normalizedQuery, searchTokens, childKeySet),
		totals: {
			all: snapshotResult.snapshot.meta.tasks.length,
			visible: tasks.length,
			directChildren: directChildCount,
		},
		tagOptions: buildTagOptions(snapshotResult.snapshot.meta.tasks),
		query: normalizedQuery,
	};
}

function buildTagOptions(tasks: TaskSummary[]): string[] {
	//
	const tags = new Set<string>();

	for (const task of tasks) {
		for (const tag of task.tags) {
			tags.add(tag);
		}
	}

	return Array.from(tags).sort((left, right) => left.localeCompare(right));
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
			relatedTasks: [],
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
			relatedTasks: [],
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
			taskPath: relatedTask.taskPath,
			section: relatedTask.section,
		}));

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
			absolutePath: task.absolutePath,
			directoryPath: task.directoryPath,
			taskPath: task.taskPath,
			pathSegments: task.pathSegments,
			section: task.section,
			config: task.config,
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
