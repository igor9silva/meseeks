import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import type { TaskSummary } from "~/server/taskIndexSchemas";

function getProjectRoot(): string {
	//
	return resolve(process.cwd(), "..");
}

function getTaskRoot(taskSource: TaskSummary["taskSource"]): string {
	//
	const projectRoot = getProjectRoot();

	if (taskSource === "private") {
		return join(projectRoot, "private", "tasks");
	}

	return join(projectRoot, "tasks");
}

function stripExtension(relativePath: string): string {
	//
	const extension = posix.extname(relativePath);

	if (extension.length === 0) return relativePath;
	return relativePath.slice(0, relativePath.length - extension.length);
}

function createTaskKey(relativePath: string, taskSource: TaskSummary["taskSource"]): string {
	//
	const withoutExtension = stripExtension(relativePath);
	const baseName = posix.basename(withoutExtension);

	let pathKey: string;

	if (baseName !== "_index") {
		pathKey = withoutExtension;
	} else {
		const directoryName = posix.dirname(withoutExtension);
		pathKey = directoryName === "." ? "_index" : directoryName;
	}

	return `${taskSource}:${pathKey}`;
}

function runTaskIndexBuild(): void {
	//
	// organizer runs from its own subdirectory, but the task indexer lives at repo root
	const buildResult = spawnSync("bun", ["run", ".config/generate-task-index.ts"], {
		cwd: getProjectRoot(),
		encoding: "utf-8",
	});

	if (buildResult.status === 0) return;

	const errorOutput = [buildResult.stdout, buildResult.stderr]
		.filter((chunk) => chunk.trim().length > 0)
		.join("\n")
		.trim();

	throw new Error(
		errorOutput.length > 0 ? `failed to rebuild task indexes\n${errorOutput}` : "failed to rebuild task indexes",
	);
}

export interface MarkTaskDoneResult {
	newRelativePath: string;
	newTaskKey: string;
}

type TaskPriority = "critical" | "high" | "medium" | "low";
type TagMutationAction = "add" | "remove";

interface FrontmatterSection {
	rawFrontmatter: string;
	body: string;
}

export interface CreateTaskInput {
	body: string;
	filename: string;
	priority: TaskPriority;
	status: string;
	tags: string[];
	taskSource: TaskSummary["taskSource"];
	title: string;
}

export interface CreateTaskResult {
	absolutePath: string;
	newRelativePath: string;
	newTaskKey: string;
	status: string;
	taskSource: TaskSummary["taskSource"];
}

export interface UpdateTaskTagsInput {
	action: TagMutationAction;
	tag: string;
}

export interface UpdateTaskTagsResult {
	tags: string[];
}

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

function normalizeTaskTag(tag: string): string {
	//
	const normalizedTag = tag
		.trim()
		.toLowerCase()
		.replace(/[\s_]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");

	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedTag)) {
		throw new Error("tag must use letters, numbers, or hyphens");
	}

	return normalizedTag;
}

function normalizeTaskStatus(status: string): string {
	//
	const normalizedStatus = status
		.trim()
		.toLowerCase()
		.replace(/[\s_]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");

	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedStatus)) {
		throw new Error("status must use letters, numbers, or hyphens");
	}

	return normalizedStatus;
}

function normalizeTaskTitle(title: string): string {
	//
	const normalizedTitle = title.trim().replace(/\s+/g, " ");

	if (normalizedTitle.length === 0) {
		throw new Error("title is required");
	}

	return normalizedTitle;
}

function slugifyTaskFilename(value: string): string {
	//
	const slug = value
		.toLowerCase()
		.replace(/'/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");

	if (slug.length === 0) {
		throw new Error("filename must include at least one letter or number");
	}

	return slug;
}

function stripKnownTaskFileExtension(filename: string): string {
	//
	return filename.trim().replace(/\.(?:mdx|md|txt)$/i, "");
}

function normalizeTaskFilename(filename: string, fallbackTitle: string): string {
	//
	const rawFilename = filename.trim().length > 0 ? filename : fallbackTitle;
	const withoutExtension = stripKnownTaskFileExtension(rawFilename);

	return slugifyTaskFilename(withoutExtension);
}

function doesTaskKeyPathExist(taskRoot: string, relativePathBase: string): boolean {
	//
	const absolutePathBase = join(taskRoot, ...relativePathBase.split("/"));
	const taskFileCandidates = [
		`${absolutePathBase}.mdx`,
		`${absolutePathBase}.md`,
		`${absolutePathBase}.txt`,
		absolutePathBase,
	];
	const indexFileCandidates = [
		join(absolutePathBase, "_index.mdx"),
		join(absolutePathBase, "_index.md"),
		join(absolutePathBase, "_index.txt"),
		join(absolutePathBase, "_index"),
	];

	return taskFileCandidates
		.concat(indexFileCandidates)
		.some((candidatePath) => existsSync(candidatePath));
}

function createUniqueTaskRelativePath(
	taskRoot: string,
	status: string,
	slug: string,
): string {
	//
	for (let attempt = 1; attempt <= 1000; attempt += 1) {
		const candidateSlug = attempt === 1 ? slug : `${slug}-${attempt}`;
		const relativePathBase = posix.join(status, candidateSlug);

		if (!doesTaskKeyPathExist(taskRoot, relativePathBase)) {
			return `${relativePathBase}.mdx`;
		}
	}

	throw new Error("could not find an available task filename");
}

function renderFrontmatterString(value: string): string {
	//
	return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function renderTaskFrontmatter(
	title: string,
	priority: TaskPriority,
	tags: string[],
): string {
	//
	return [
		"---",
		`title: ${renderFrontmatterString(title)}`,
		`priority: ${priority}`,
		renderTagsFrontmatterLine(tags),
		"---",
	].join("\n");
}

function renderCreatedTaskBody(title: string, body: string): string {
	//
	const trimmedBody = body.replace(/\r\n/g, "\n").trim();

	if (trimmedBody.length > 0) {
		const hasHeading = trimmedBody
			.split("\n")
			.some((line) => /^#\s+/.test(line.trim()));

		if (hasHeading) return `${trimmedBody}\n`;
		return `# ${title}\n\n${trimmedBody}\n`;
	}

	const today = new Date().toISOString().slice(0, 10);

	return [
		`# ${title}`,
		"",
		"## Context",
		"",
		"## Objective",
		"",
		"## Subtasks",
		"- [ ] Define first step",
		"",
		"## Progress Log",
		`### ${today}`,
		"- Task created",
		"",
		"## Notes",
		"",
	].join("\n");
}

function renderCreatedTaskFile(input: {
	body: string;
	priority: TaskPriority;
	tags: string[];
	title: string;
}): string {
	//
	return [
		renderTaskFrontmatter(input.title, input.priority, input.tags),
		"",
		renderCreatedTaskBody(input.title, input.body),
	].join("\n");
}

function extractFrontmatterSection(fileContent: string): FrontmatterSection | null {
	//
	const withoutBom = fileContent.replace(/^\uFEFF/, "");

	if (!withoutBom.startsWith("---\n") && withoutBom !== "---") {
		return null;
	}

	const lines = withoutBom.split("\n");

	if (lines.length === 0 || lines[0].trim() !== "---") {
		return null;
	}

	for (let index = 1; index < lines.length; index += 1) {
		if (lines[index].trim() !== "---") continue;

		return {
			rawFrontmatter: lines.slice(1, index).join("\n"),
			body: lines.slice(index + 1).join("\n"),
		};
	}

	return null;
}

function renderTagsFrontmatterLine(tags: string[]): string {
	//
	return `tags: [${tags.join(", ")}]`;
}

function upsertTagsFrontmatter(rawFrontmatter: string, tags: string[]): string {
	//
	const tagsLine = renderTagsFrontmatterLine(tags);
	const lines = rawFrontmatter.split("\n");

	for (let index = 0; index < lines.length; index += 1) {
		const pairMatch = lines[index].match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
		if (!pairMatch || pairMatch[1].trim() !== "tags") continue;

		const rawValue = pairMatch[2].trim();
		let endIndex = index + 1;

		if (rawValue.length === 0) {
			while (endIndex < lines.length) {
				if (!/^\s*-\s+/.test(lines[endIndex])) break;
				endIndex += 1;
			}
		}

		return lines
			.slice(0, index)
			.concat(tagsLine, lines.slice(endIndex))
			.join("\n");
	}

	if (rawFrontmatter.length === 0) return tagsLine;
	return `${rawFrontmatter}\n${tagsLine}`;
}

function renderFileContentWithTags(fileContent: string, tags: string[]): string {
	//
	const frontmatterSection = extractFrontmatterSection(fileContent);

	if (frontmatterSection === null) {
		return `---\n${renderTagsFrontmatterLine(tags)}\n---\n\n${fileContent.replace(/^\uFEFF/, "")}`;
	}

	const nextRawFrontmatter = upsertTagsFrontmatter(
		frontmatterSection.rawFrontmatter,
		tags,
	);

	return `---\n${nextRawFrontmatter}\n---\n${frontmatterSection.body}`;
}

export function markTaskDone(task: TaskSummary): MarkTaskDoneResult {
	//
	if (task.status === "completed" || task.relativePath.startsWith("completed/")) {
		throw new Error("task is already completed");
	}

	const taskRoot = getTaskRoot(task.taskSource);
	const sourceAbsolutePath = join(taskRoot, task.relativePath);
	const newRelativePath = posix.join("completed", task.relativePath);
	const destinationAbsolutePath = join(taskRoot, newRelativePath);

	if (!existsSync(sourceAbsolutePath)) {
		throw new Error(`task file no longer exists at ${sourceAbsolutePath}`);
	}

	if (existsSync(destinationAbsolutePath)) {
		throw new Error(`completed task already exists at ${destinationAbsolutePath}`);
	}

	mkdirSync(dirname(destinationAbsolutePath), { recursive: true });
	renameSync(sourceAbsolutePath, destinationAbsolutePath);

	try {
		runTaskIndexBuild();
	} catch (error) {
		renameSync(destinationAbsolutePath, sourceAbsolutePath);
		throw error;
	}

	return {
		newRelativePath,
		newTaskKey: createTaskKey(newRelativePath, task.taskSource),
	};
}

export function createTask(input: CreateTaskInput): CreateTaskResult {
	//
	const title = normalizeTaskTitle(input.title);
	const status = normalizeTaskStatus(input.status);
	const tags = dedupeStrings(input.tags.map((tag) => normalizeTaskTag(tag)));
	const filename = normalizeTaskFilename(input.filename, title);
	const taskRoot = getTaskRoot(input.taskSource);
	const newRelativePath = createUniqueTaskRelativePath(taskRoot, status, filename);
	const absolutePath = join(taskRoot, ...newRelativePath.split("/"));
	const fileContent = renderCreatedTaskFile({
		body: input.body,
		priority: input.priority,
		tags,
		title,
	});

	mkdirSync(dirname(absolutePath), { recursive: true });
	writeFileSync(absolutePath, fileContent, { encoding: "utf-8", flag: "wx" });

	try {
		runTaskIndexBuild();
	} catch (error) {
		unlinkSync(absolutePath);
		throw error;
	}

	return {
		absolutePath,
		newRelativePath,
		newTaskKey: createTaskKey(newRelativePath, input.taskSource),
		status,
		taskSource: input.taskSource,
	};
}

export function updateTaskTags(
	task: TaskSummary,
	input: UpdateTaskTagsInput,
): UpdateTaskTagsResult {
	//
	const taskRoot = getTaskRoot(task.taskSource);
	const absolutePath = join(taskRoot, task.relativePath);

	if (!existsSync(absolutePath)) {
		throw new Error(`task file no longer exists at ${absolutePath}`);
	}

	const normalizedTag = normalizeTaskTag(input.tag);
	const currentTags = dedupeStrings(task.tags);
	const nextTags =
		input.action === "add"
			? dedupeStrings(currentTags.concat(normalizedTag))
			: currentTags.filter((tag) => tag !== normalizedTag);

	if (nextTags.length === currentTags.length) {
		const hasSameTags = nextTags.every((tag, index) => tag === currentTags[index]);
		if (hasSameTags) return { tags: currentTags };
	}

	const originalContent = readFileSync(absolutePath, "utf-8");
	const nextContent = renderFileContentWithTags(originalContent, nextTags);

	writeFileSync(absolutePath, nextContent, "utf-8");

	try {
		runTaskIndexBuild();
	} catch (error) {
		writeFileSync(absolutePath, originalContent, "utf-8");
		throw error;
	}

	return {
		tags: nextTags,
	};
}
