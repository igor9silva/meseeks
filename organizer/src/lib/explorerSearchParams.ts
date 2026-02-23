import { z } from "zod";

export const explorerSortSchema = z.enum([
	"priority_then_recency",
	"recency",
	"title",
]);

const taskSourceSchema = z.enum(["public", "private"]);

export const explorerRouteSearchSchema = z.object({
	q: z.string().optional(),
	sources: z.string().optional(),
	statuses: z.string().optional(),
	tags: z.string().optional(),
	sort: explorerSortSchema.optional(),
	taskKey: z.string().optional(),
});

export type ExplorerRouteSearch = z.infer<typeof explorerRouteSearchSchema>;
export type ExplorerSort = z.infer<typeof explorerSortSchema>;
export type TaskSource = z.infer<typeof taskSourceSchema>;

export interface ExplorerQueryInput {
	q: string;
	sources: TaskSource[];
	statuses: string[];
	tags: string[];
	sort: ExplorerSort;
}

export function splitCsv(value: string | undefined): string[] {
	//
	if (!value) return [];

	return value
		.split(",")
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
	const parsed: TaskSource[] = [];

	for (const entry of splitCsv(value)) {
		const result = taskSourceSchema.safeParse(entry);
		if (!result.success) continue;
		parsed.push(result.data);
	}

	const deduped = dedupeStrings(parsed);

	if (deduped.length === 0) return ["public", "private"];
	return deduped;
}

export function parseStatuses(value: string | undefined): string[] {
	//
	const statuses = dedupeStrings(splitCsv(value));
	if (statuses.length === 0) return ["active", "backlog"];
	return statuses;
}

export function parseTags(value: string | undefined): string[] {
	//
	return dedupeStrings(splitCsv(value));
}

export function serializeCsv(values: string[]): string | undefined {
	//
	if (values.length === 0) return undefined;
	return values.join(",");
}

export function parseExplorerQuery(
	search: ExplorerRouteSearch,
): ExplorerQueryInput {
	//
	return {
		q: search.q?.trim() ?? "",
		sources: parseSources(search.sources),
		statuses: parseStatuses(search.statuses),
		tags: parseTags(search.tags),
		sort: search.sort ?? "priority_then_recency",
	};
}
