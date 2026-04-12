import { existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { spawnSync } from "node:child_process";
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
