import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import type { TaskSummary } from '~/server/taskIndexSchemas';
import {
	createTitleFromBody,
	dedupeStrings,
	normalizeTaskTag,
	normalizeTaskTitle,
	renderCreatedTaskFile,
} from '~/server/taskMutationFrontmatter';
import {
	createSystemTrashPath,
	createTaskKey,
	createUniqueTaskPath,
	getTaskDirectory,
	getTaskRoot,
	normalizeRenameTaskFilename,
	normalizeTaskFilename,
	normalizeTaskPath,
	runTaskIndexBuild,
} from '~/server/taskMutationPaths';
import { replaceStatusTag } from '~/server/taskMutationStatus';
import type {
	CreateTaskInput,
	CreateTaskResult,
	RenameTaskInput,
	RenameTaskResult,
	TrashTaskResult,
	UpdateTaskSourceInput,
	UpdateTaskSourceResult,
} from '~/server/taskMutationTypes';

export function updateTaskSource(task: TaskSummary, input: UpdateTaskSourceInput): UpdateTaskSourceResult {
	//
	if (input.taskSource === task.taskSource) {
		return {
			newTaskKey: task.key,
			taskSource: task.taskSource,
		};
	}

	if (task.taskPath.length === 0) {
		throw new Error('visibility roots cannot be moved');
	}

	const sourceAbsolutePath = getTaskDirectory(task);
	const destinationTaskRoot = getTaskRoot(input.taskSource);
	const destinationAbsolutePath = join(destinationTaskRoot, ...task.taskPath.split('/'));

	if (!existsSync(sourceAbsolutePath)) {
		throw new Error(`task directory no longer exists at ${sourceAbsolutePath}`);
	}

	if (existsSync(destinationAbsolutePath)) {
		throw new Error(`task already exists at ${destinationAbsolutePath}`);
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
		newTaskKey: createTaskKey(task.taskPath, input.taskSource),
		taskSource: input.taskSource,
	};
}

export function trashTask(task: TaskSummary): TrashTaskResult {
	//
	if (task.taskPath.length === 0) {
		throw new Error('visibility roots cannot be trashed');
	}

	const sourceAbsolutePath = getTaskDirectory(task);
	const destinationAbsolutePath = createSystemTrashPath(sourceAbsolutePath);

	if (!existsSync(sourceAbsolutePath)) {
		throw new Error(`task directory no longer exists at ${sourceAbsolutePath}`);
	}

	renameSync(sourceAbsolutePath, destinationAbsolutePath);

	try {
		runTaskIndexBuild();
	} catch (error) {
		renameSync(destinationAbsolutePath, sourceAbsolutePath);
		throw error;
	}

	return {
		trashedPath: destinationAbsolutePath,
	};
}

export function renameTask(task: TaskSummary, input: RenameTaskInput): RenameTaskResult {
	//
	if (task.taskPath.length === 0) {
		throw new Error('visibility roots cannot be renamed');
	}

	const filename = normalizeRenameTaskFilename(input.filename);
	const taskDirectory = getTaskDirectory(task);
	const parentPath = posix.dirname(task.taskPath);
	const normalizedParentPath = parentPath === '.' ? '' : parentPath;
	const nextTaskPath = normalizedParentPath.length === 0 ? filename : posix.join(normalizedParentPath, filename);
	const destinationAbsolutePath = join(getTaskRoot(task.taskSource), ...nextTaskPath.split('/'));

	if (nextTaskPath === task.taskPath) {
		throw new Error('task already has that name');
	}

	if (!existsSync(taskDirectory)) {
		throw new Error(`task directory no longer exists at ${taskDirectory}`);
	}

	if (existsSync(destinationAbsolutePath)) {
		throw new Error(`task already exists at ${destinationAbsolutePath}`);
	}

	mkdirSync(dirname(destinationAbsolutePath), { recursive: true });
	renameSync(taskDirectory, destinationAbsolutePath);

	try {
		runTaskIndexBuild();
	} catch (error) {
		renameSync(destinationAbsolutePath, taskDirectory);
		throw error;
	}

	return {
		newTaskPath: nextTaskPath,
		newTaskKey: createTaskKey(nextTaskPath, task.taskSource),
	};
}

export function createTask(input: CreateTaskInput): CreateTaskResult {
	//
	const title = normalizeTaskTitle(input.title.length > 0 ? input.title : createTitleFromBody(input.body));
	const normalizedTags = dedupeStrings(input.tags.map((tag) => normalizeTaskTag(tag)));
	const parentPath = normalizeTaskPath(input.parentPath.length > 0 ? input.parentPath : 'inbox');
	const taskRoot = getTaskRoot(input.taskSource);
	const filename = normalizeTaskFilename(input.filename, title);
	const taskPath = createUniqueTaskPath(taskRoot, parentPath, filename);
	const taskDirectory = join(taskRoot, ...taskPath.split('/'));
	const absolutePath = join(taskDirectory, '_index.md');
	const shouldApplyStatus = taskPath === 'tasks' || taskPath.startsWith('tasks/');
	const tags =
		shouldApplyStatus && input.status !== null ? replaceStatusTag(normalizedTags, input.status) : normalizedTags;
	const fileContent = renderCreatedTaskFile({
		body: input.body,
		priority: input.priority,
		tags,
		title,
	});

	mkdirSync(taskDirectory, { recursive: true });
	writeFileSync(absolutePath, fileContent, { encoding: 'utf-8', flag: 'wx' });

	try {
		runTaskIndexBuild();
	} catch (error) {
		rmSync(taskDirectory, { recursive: true, force: true });
		throw error;
	}

	return {
		absolutePath,
		newRelativePath: posix.join(taskPath, '_index.md'),
		newTaskKey: createTaskKey(taskPath, input.taskSource),
		taskPath,
		taskSource: input.taskSource,
	};
}
