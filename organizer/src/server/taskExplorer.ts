import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { readTaskIndexSnapshot } from "~/server/taskIndexRepository";
import type { TaskSummary } from "~/server/taskIndexSchemas";

const taskSourceSchema = z.enum(["public", "private"]);
const explorerSortSchema = z.enum([
	"priority_then_recency",
	"recency",
	"title",
]);
const defaultSources: Array<z.infer<typeof taskSourceSchema>> = [
	"public",
	"private",
];

const explorerQuerySchema = z.object({
	q: z.string().optional().default(""),
	sources: z.array(taskSourceSchema).optional().default(["public", "private"]),
	statuses: z
		.array(z.string().min(1))
		.optional()
		.default(["active", "backlog"]),
	tags: z.array(z.string().min(1)).optional().default([]),
	sort: explorerSortSchema.optional().default("priority_then_recency"),
});

const detailQuerySchema = z.object({
	taskKey: z.string().min(1),
});

type ExplorerQuery = z.infer<typeof explorerQuerySchema>;

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
	const normalizedSources =
		input.sources.length > 0 ? input.sources : defaultSources;
	const normalizedStatuses =
		input.statuses.length > 0
			? dedupeStrings(input.statuses)
			: ["active", "backlog"];
	const normalizedTags = dedupeStrings(input.tags);

	return {
		q: input.q.trim(),
		sources: normalizedSources,
		statuses: normalizedStatuses,
		tags: normalizedTags,
		sort: input.sort,
	};
}

function priorityRank(priority: string | null): number {
	//
	if (priority === null) return 4;

	const normalized = priority.toLowerCase();
	if (normalized === "critical") return 0;
	if (normalized === "high") return 1;
	if (normalized === "medium") return 2;
	if (normalized === "low") return 3;

	return 4;
}

function compareTasks(
	left: TaskSummary,
	right: TaskSummary,
	sort: z.infer<typeof explorerSortSchema>,
): number {
	//
	if (sort === "recency") {
		if (left.fileMtimeMs !== right.fileMtimeMs)
			return right.fileMtimeMs - left.fileMtimeMs;
		return left.title.localeCompare(right.title);
	}

	if (sort === "title") {
		return left.title.localeCompare(right.title);
	}

	const leftPriority = priorityRank(left.priority);
	const rightPriority = priorityRank(right.priority);

	if (leftPriority !== rightPriority) return leftPriority - rightPriority;
	if (left.fileMtimeMs !== right.fileMtimeMs)
		return right.fileMtimeMs - left.fileMtimeMs;
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

function buildFacets(tasks: TaskSummary[]) {
	//
	const sourceCounts = new Map<string, number>();
	const statusCounts = new Map<string, number>();
	const tagCounts = new Map<string, number>();

	for (const task of tasks) {
		sourceCounts.set(
			task.taskSource,
			(sourceCounts.get(task.taskSource) ?? 0) + 1,
		);
		statusCounts.set(task.status, (statusCounts.get(task.status) ?? 0) + 1);

		for (const tag of task.tags) {
			tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
		}
	}

	const sources = Array.from(sourceCounts.entries()).map(([value, count]) => ({
		value,
		count,
	}));
	const statuses = Array.from(statusCounts.entries())
		.map(([value, count]) => ({ value, count }))
		.sort((left, right) => left.value.localeCompare(right.value));
	const tags = Array.from(tagCounts.entries())
		.map(([value, count]) => ({ value, count }))
		.sort((left, right) => {
			if (left.count !== right.count) return right.count - left.count;
			return left.value.localeCompare(right.value);
		});

	return {
		sources,
		statuses,
		tags,
	};
}

function createTaskLookup(tasks: TaskSummary[]): Map<string, TaskSummary> {
	//
	const taskByKey = new Map<string, TaskSummary>();

	for (const task of tasks) {
		taskByKey.set(task.key, task);
	}

	return taskByKey;
}

export const getExplorerSnapshot = createServerFn({ method: "GET" })
	.inputValidator((input: unknown) => explorerQuerySchema.parse(input))
	.handler(({ data }) => {
		const snapshotResult = readTaskIndexSnapshot();

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
				query: normalizeQueryInput(data),
			};
		}

		const normalizedQuery = normalizeQueryInput(data);
		const searchTokens = normalizedQuery.q
			.toLowerCase()
			.split(/\s+/)
			.map((token) => token.trim())
			.filter((token) => token.length > 0);

		const scoredTasks: Array<{ task: TaskSummary; score: number }> = [];

		for (const task of snapshotResult.snapshot.meta.tasks) {
			if (!normalizedQuery.sources.includes(task.taskSource)) continue;
			if (!normalizedQuery.statuses.includes(task.status)) continue;

			if (normalizedQuery.tags.length > 0) {
				const hasMatchingTag = task.tags.some((tag) =>
					normalizedQuery.tags.includes(tag),
				);
				if (!hasMatchingTag) continue;
			}

			const score = calculateSearchScore(task, searchTokens);

			if (searchTokens.length > 0 && score <= 0) continue;

			scoredTasks.push({ task, score });
		}

		scoredTasks.sort((left, right) => {
			if (searchTokens.length > 0 && left.score !== right.score)
				return right.score - left.score;
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
			facets: buildFacets(snapshotResult.snapshot.meta.tasks),
			totals: {
				all: snapshotResult.snapshot.meta.tasks.length,
				visible: tasks.length,
			},
			query: normalizedQuery,
		};
	});

export const getTaskDetail = createServerFn({ method: "GET" })
	.inputValidator((input: unknown) => detailQuerySchema.parse(input))
	.handler(({ data }) => {
		const snapshotResult = readTaskIndexSnapshot();

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
		const task = taskByKey.get(data.taskKey) ?? null;

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

		const contentEntry =
			snapshotResult.snapshot.content.entries.find(
				(entry) => entry.key === task.key,
			) ?? null;
		const graphEdges = snapshotResult.snapshot.graph.edges;

		const parentEdge = graphEdges.find(
			(edge) =>
				edge.type === "parent" &&
				edge.from === task.key &&
				edge.resolved &&
				edge.to !== null,
		);

		const childKeys = graphEdges
			.filter(
				(edge) =>
					edge.type === "parent" && edge.to === task.key && edge.resolved,
			)
			.map((edge) => edge.from);

		const parentKey = parentEdge?.to ?? null;

		const relationKeys = dedupeStrings([
			...(parentKey ? [parentKey] : []),
			...childKeys,
		]);

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

		const absolutePath =
			typeof task.absolutePath === "string" ? task.absolutePath : null;

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
				body: contentEntry?.body ?? "",
				rawFrontmatter: contentEntry?.rawFrontmatter ?? null,
			},
			relations: {
				parentKey,
				children: childKeys,
			},
			relatedTasks,
		};
	});
