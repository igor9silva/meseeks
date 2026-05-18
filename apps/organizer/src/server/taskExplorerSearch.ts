import { ROOT_PARENT_KEY } from '~/lib/explorerSearchParams';
import type { ExplorerQuery } from '~/server/taskExplorerSchemas';
import type { TaskSummary } from '~/server/taskIndexSchemas';

export function dedupeStrings(values: string[]): string[] {
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

export function normalizeQueryInput(input: ExplorerQuery): ExplorerQuery {
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

export function compareTasks(left: TaskSummary, right: TaskSummary, sort: ExplorerQuery['sort']): number {
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

export function compareNavigationChildren(left: TaskSummary, right: TaskSummary, parentKey: string | null): number {
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

export function calculateSearchScore(task: TaskSummary, tokens: string[]): number {
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

export function matchesTaskFilters(
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
		for (const tag of query.tags) {
			if (!task.tags.includes(tag)) return false;
		}
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
