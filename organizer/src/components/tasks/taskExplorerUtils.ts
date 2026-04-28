import type {
	ExplorerQueryInput,
	TaskSource,
} from "~/lib/explorerSearchParams";
import type { CreateTaskInput } from "~/server/taskExplorer";
import type { CreateTaskDefaults, TaskDetailTask } from "./taskExplorerTypes";

export const taskSourceOptions: TaskSource[] = ["public", "private"];
export const taskPriorityOptions: Array<CreateTaskInput["priority"]> = [
	"critical",
	"high",
	"medium",
	"low",
];
export const defaultStatusOptions = ["active", "backlog", "inbox"];
export const SEARCH_DEBOUNCE_MS = 150;

export function formatSourceLabel(source: TaskSource): string {
	//
	return source === "private" ? "Private" : "Public";
}

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

export function getCreateTaskDefaults(
	queryInput: ExplorerQueryInput,
): CreateTaskDefaults {
	//
	let taskSource: TaskSource = "public";
	let status = "backlog";

	if (queryInput.sources.length === 1) {
		const onlySource = queryInput.sources[0];
		if (onlySource) taskSource = onlySource;
	}

	if (queryInput.statuses.length === 1) {
		const onlyStatus = queryInput.statuses[0];
		if (onlyStatus) status = onlyStatus;
	}

	return {
		status,
		taskSource,
	};
}

export function parseTaskSource(value: string): TaskSource | null {
	//
	if (value === "public") return value;
	if (value === "private") return value;
	return null;
}

export function parseTaskPriority(
	value: string,
): CreateTaskInput["priority"] | null {
	//
	if (value === "critical") return value;
	if (value === "high") return value;
	if (value === "medium") return value;
	if (value === "low") return value;
	return null;
}

export function parseTagDraft(value: string): string[] {
	//
	return dedupeStrings(
		value
			.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0),
	);
}

export function createTaskFilename(value: string): string {
	//
	const withoutKnownExtension = value.trim().replace(/\.(?:mdx|md|txt)$/i, "");

	return withoutKnownExtension
		.toLowerCase()
		.replace(/'/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function getMutationErrorMessage(
	error: unknown,
	fallback: string,
): string {
	//
	return error instanceof Error ? error.message : fallback;
}

export function toCursorFileHref(absolutePath: string | null): string | null {
	//
	if (!absolutePath) return null;
	return `cursor://file${encodeURI(absolutePath)}`;
}

export function toCursorTaskHref(task: TaskDetailTask): string {
	//
	const url = new URL("cursor://anysphere.cursor-deeplink/prompt");

	url.searchParams.set("text", task.body.trim());

	return url.toString();
}

export function toCodexTaskHref(task: TaskDetailTask): string {
	//
	const url = new URL("codex://new");

	url.searchParams.set("prompt", task.body.trim());

	return url.toString();
}
