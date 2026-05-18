import type { ExplorerQuery } from '~/server/taskExplorerSchemas';
import type { SnapshotResult } from '~/server/taskIndexRepository';
import type { TaskSummary } from '~/server/taskIndexSchemas';
import { buildFacets, buildTagOptions } from './taskExplorerFacets';
import { buildChildKeySet, buildHierarchyRanks, getDirectChildKeys } from './taskExplorerHierarchy';
import { createTaskLookup } from './taskExplorerLookup';
import {
	calculateSearchScore,
	compareNavigationChildren,
	compareTasks,
	dedupeStrings,
	matchesTaskFilters,
	normalizeQueryInput,
} from './taskExplorerSearch';

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
	const shouldUseNavigationOrder =
		normalizedQuery.q.length === 0 &&
		normalizedQuery.tags.length === 0 &&
		normalizedQuery.excludedTags.length === 0;
	const hierarchyRanks =
		shouldUseNavigationOrder
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

		if (shouldUseNavigationOrder) {
			const navigationComparison = compareNavigationChildren(left.task, right.task, normalizedQuery.parentKey);
			if (navigationComparison !== 0) return navigationComparison;
		}

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
