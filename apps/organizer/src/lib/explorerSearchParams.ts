import { z } from 'zod';

export const explorerSortSchema = z.enum(['priority_then_recency', 'recency', 'title']);

const taskSourceSchema = z.enum(['public', 'private']);

export const ROOT_PARENT_KEY = '__task_roots__';

export const explorerRouteSearchSchema = z.object({
	q: z.string().optional(),
	sources: z.string().optional(),
	tags: z.string().optional(),
	excludedTags: z.string().optional(),
	detail: z.string().optional(),
	expanded: z.string().optional(),
	depth: z.union([z.string(), z.number()]).optional(),
	minDepth: z.union([z.string(), z.number()]).optional(),
	maxDepth: z.union([z.string(), z.number()]).optional(),
	sort: explorerSortSchema.optional(),
	selected: z.string().optional(),
});

export type ExplorerRouteSearch = z.infer<typeof explorerRouteSearchSchema>;
export type ExplorerSort = z.infer<typeof explorerSortSchema>;
export type TaskSource = z.infer<typeof taskSourceSchema>;

export interface ExplorerQueryInput {
	q: string;
	sources: TaskSource[];
	tags: string[];
	excludedTags: string[];
	parentKey: string | null;
	minDepth: number;
	maxDepth: number;
	sort: ExplorerSort;
}

function parseDepth(value: string | number | undefined): number {
	//
	if (value === undefined) return 1;

	const numericValue = Number(value);
	if (!Number.isInteger(numericValue)) return 1;
	if (numericValue < 1) return 1;
	if (numericValue > 16) return 16;

	return numericValue;
}

function parseDepthRange(search: ExplorerRouteSearch): { minDepth: number; maxDepth: number } {
	//
	const parsedMinDepth = parseDepth(search.minDepth);
	const parsedMaxDepth = parseDepth(search.maxDepth ?? search.depth);

	return {
		minDepth: Math.min(parsedMinDepth, parsedMaxDepth),
		maxDepth: Math.max(parsedMinDepth, parsedMaxDepth),
	};
}

export function splitCsv(value: string | undefined): string[] {
	//
	if (!value) return [];

	return value
		.split(',')
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

function dedupeStrings<T extends string>(values: T[]): T[] {
	//
	const seen = new Set<T>();
	const output: T[] = [];

	for (const value of values) {
		if (seen.has(value)) continue;
		seen.add(value);
		output.push(value);
	}

	return output;
}

export function parseSources(value: string | undefined): TaskSource[] {
	//
	if (value === undefined) return ['public', 'private'];
	if (value.trim().length === 0) return [];

	const parsed: TaskSource[] = [];

	for (const entry of splitCsv(value)) {
		const result = taskSourceSchema.safeParse(entry);
		if (!result.success) continue;
		parsed.push(result.data);
	}

	return dedupeStrings(parsed);
}

export function parseTags(value: string | undefined): string[] {
	//
	return dedupeStrings(splitCsv(value));
}

export function serializeCsv(values: string[]): string | undefined {
	//
	if (values.length === 0) return undefined;
	return values.join(',');
}

export function parseExplorerQuery(search: ExplorerRouteSearch, parentKey: string | null): ExplorerQueryInput {
	//
	const depthRange = parseDepthRange(search);

	return {
		q: search.q ?? '',
		sources: ['public', 'private'],
		tags: parseTags(search.tags),
		excludedTags: parseTags(search.excludedTags),
		parentKey,
		minDepth: depthRange.minDepth,
		maxDepth: depthRange.maxDepth,
		sort: search.sort ?? 'priority_then_recency',
	};
}
