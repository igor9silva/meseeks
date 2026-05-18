import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { TaskSummary } from '~/server/taskIndexSchemas';
import {
	dedupeStrings,
	normalizeTaskTag,
	normalizeTaskTitle,
	renderFileContentWithPriority,
	renderFileContentWithTags,
	renderFileContentWithTitle,
} from '~/server/taskMutationFrontmatter';
import { getTaskIndexPath, runTaskIndexBuild } from '~/server/taskMutationPaths';
import type {
	MarkTaskDoneResult,
	MoveTaskInput,
	MoveTaskResult,
	UpdateTaskPriorityInput,
	UpdateTaskPriorityResult,
	UpdateTaskTagsInput,
	UpdateTaskTagsResult,
	UpdateTaskTitleInput,
	UpdateTaskTitleResult,
} from '~/server/taskMutationTypes';

export function replaceStatusTag(tags: string[], status: string): string[] {
	//
	const withoutStatus = tags.filter((tag) => !tag.startsWith('status:'));
	return dedupeStrings(withoutStatus.concat(`status:${status}`));
}

export function markTaskDone(task: TaskSummary): MarkTaskDoneResult {
	//
	return moveTask(task, { status: 'completed' });
}

export function moveTask(task: TaskSummary, input: MoveTaskInput): MoveTaskResult {
	//
	if (task.status === input.status) {
		return {
			newTaskKey: task.key,
			status: input.status,
		};
	}

	const absolutePath = getTaskIndexPath(task);

	if (!existsSync(absolutePath)) {
		throw new Error(`task file no longer exists at ${absolutePath}`);
	}

	const originalContent = readFileSync(absolutePath, 'utf-8');
	const nextTags = replaceStatusTag(task.tags, input.status);
	const nextContent = renderFileContentWithTags(originalContent, nextTags);

	writeFileSync(absolutePath, nextContent, 'utf-8');

	try {
		runTaskIndexBuild();
	} catch (error) {
		writeFileSync(absolutePath, originalContent, 'utf-8');
		throw error;
	}

	return {
		newTaskKey: task.key,
		status: input.status,
	};
}

export function updateTaskTags(task: TaskSummary, input: UpdateTaskTagsInput): UpdateTaskTagsResult {
	//
	const absolutePath = getTaskIndexPath(task);

	if (!existsSync(absolutePath)) {
		throw new Error(`task file no longer exists at ${absolutePath}`);
	}

	const normalizedTag = normalizeTaskTag(input.tag);
	const currentTags = dedupeStrings(task.tags);
	const nextTags =
		input.action === 'add'
			? dedupeStrings(currentTags.concat(normalizedTag))
			: currentTags.filter((tag) => tag !== normalizedTag);

	if (nextTags.length === currentTags.length) {
		const hasSameTags = nextTags.every((tag, index) => tag === currentTags[index]);
		if (hasSameTags) return { tags: currentTags };
	}

	const originalContent = readFileSync(absolutePath, 'utf-8');
	const nextContent = renderFileContentWithTags(originalContent, nextTags);

	writeFileSync(absolutePath, nextContent, 'utf-8');

	try {
		runTaskIndexBuild();
	} catch (error) {
		writeFileSync(absolutePath, originalContent, 'utf-8');
		throw error;
	}

	return {
		tags: nextTags,
	};
}

export function updateTaskPriority(task: TaskSummary, input: UpdateTaskPriorityInput): UpdateTaskPriorityResult {
	//
	const absolutePath = getTaskIndexPath(task);

	if (!existsSync(absolutePath)) {
		throw new Error(`task file no longer exists at ${absolutePath}`);
	}

	if (input.priority === task.priority) {
		return { priority: input.priority };
	}

	const originalContent = readFileSync(absolutePath, 'utf-8');
	const nextContent = renderFileContentWithPriority(originalContent, input.priority);

	writeFileSync(absolutePath, nextContent, 'utf-8');

	try {
		runTaskIndexBuild();
	} catch (error) {
		writeFileSync(absolutePath, originalContent, 'utf-8');
		throw error;
	}

	return { priority: input.priority };
}

export function updateTaskTitle(task: TaskSummary, input: UpdateTaskTitleInput): UpdateTaskTitleResult {
	//
	const title = normalizeTaskTitle(input.title);
	const absolutePath = getTaskIndexPath(task);

	if (!existsSync(absolutePath)) {
		throw new Error(`task file no longer exists at ${absolutePath}`);
	}

	if (title === task.title) {
		return { title };
	}

	const originalContent = readFileSync(absolutePath, 'utf-8');
	const nextContent = renderFileContentWithTitle(originalContent, title);

	writeFileSync(absolutePath, nextContent, 'utf-8');

	try {
		runTaskIndexBuild();
	} catch (error) {
		writeFileSync(absolutePath, originalContent, 'utf-8');
		throw error;
	}

	return { title };
}
