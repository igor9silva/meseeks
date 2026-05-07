import { createServerFn } from '@tanstack/react-start';
import { buildExplorerSnapshot, buildTaskDetail, createTaskLookup } from '~/server/taskExplorerReadModel';
import {
	type CreateTaskInput,
	createTaskInputSchema,
	detailQuerySchema,
	explorerQuerySchema,
	moveTaskInputSchema,
	renameTaskInputSchema,
	tagMutationSchema,
	titleMutationSchema,
} from '~/server/taskExplorerSchemas';
import { readTaskIndexSnapshot } from '~/server/taskIndexRepository';
import {
	createTask as createTaskInFilesystem,
	listTaskStatuses as listTaskStatusesInFilesystem,
	markTaskDone as markTaskDoneInFilesystem,
	moveTask as moveTaskInFilesystem,
	renameTask as renameTaskInFilesystem,
	updateTaskTags as updateTaskTagsInFilesystem,
	updateTaskTitle as updateTaskTitleInFilesystem,
} from '~/server/taskMutationRepository';

export type { CreateTaskInput } from '~/server/taskExplorerSchemas';

function mergeStatusOptions(statusOptions: string[]): string[] {
	//
	const statuses = new Set<string>();

	for (const status of statusOptions.concat(listTaskStatusesInFilesystem())) {
		statuses.add(status);
	}

	return Array.from(statuses).sort((left, right) => left.localeCompare(right));
}

export const getExplorerSnapshot = createServerFn({ method: 'GET' })
	.inputValidator((input: unknown) => explorerQuerySchema.parse(input))
	.handler(({ data }) => {
		const snapshot = buildExplorerSnapshot(readTaskIndexSnapshot(), data);

		return {
			...snapshot,
			statusOptions: mergeStatusOptions(snapshot.statusOptions),
		};
	});

export const getTaskDetail = createServerFn({ method: 'GET' })
	.inputValidator((input: unknown) => detailQuerySchema.parse(input))
	.handler(({ data }) => buildTaskDetail(readTaskIndexSnapshot(), data.taskKey));

export const createTask = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => createTaskInputSchema.parse(input))
	.handler(({ data }: { data: CreateTaskInput }) => {
		const result = createTaskInFilesystem(data);

		return {
			absolutePath: result.absolutePath,
			newRelativePath: result.newRelativePath,
			newTaskKey: result.newTaskKey,
			status: result.status,
			taskSource: result.taskSource,
		};
	});

export const markTaskDone = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => detailQuerySchema.parse(input))
	.handler(({ data }) => {
		const snapshotResult = readTaskIndexSnapshot();

		if (!snapshotResult.health.isReady || snapshotResult.snapshot === null) {
			throw new Error('task indexes are unavailable');
		}

		const taskByKey = createTaskLookup(snapshotResult.snapshot.meta.tasks);
		const task = taskByKey.get(data.taskKey) ?? null;

		if (!task) {
			throw new Error('task not found');
		}

		const result = markTaskDoneInFilesystem(task);

		return {
			oldTaskKey: data.taskKey,
			newTaskKey: result.newTaskKey,
			newRelativePath: result.newRelativePath,
		};
	});

export const moveTask = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => moveTaskInputSchema.parse(input))
	.handler(({ data }) => {
		const snapshotResult = readTaskIndexSnapshot();

		if (!snapshotResult.health.isReady || snapshotResult.snapshot === null) {
			throw new Error('task indexes are unavailable');
		}

		const taskByKey = createTaskLookup(snapshotResult.snapshot.meta.tasks);
		const task = taskByKey.get(data.taskKey) ?? null;

		if (!task) {
			throw new Error('task not found');
		}

		const result = moveTaskInFilesystem(task, {
			status: data.status,
		});

		return {
			oldTaskKey: data.taskKey,
			newTaskKey: result.newTaskKey,
			newRelativePath: result.newRelativePath,
			status: result.status,
		};
	});

export const renameTask = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => renameTaskInputSchema.parse(input))
	.handler(({ data }) => {
		const snapshotResult = readTaskIndexSnapshot();

		if (!snapshotResult.health.isReady || snapshotResult.snapshot === null) {
			throw new Error('task indexes are unavailable');
		}

		const taskByKey = createTaskLookup(snapshotResult.snapshot.meta.tasks);
		const task = taskByKey.get(data.taskKey) ?? null;

		if (!task) {
			throw new Error('task not found');
		}

		const result = renameTaskInFilesystem(task, {
			filename: data.filename,
		});

		return {
			oldTaskKey: data.taskKey,
			newTaskKey: result.newTaskKey,
			newRelativePath: result.newRelativePath,
		};
	});

export const updateTaskTags = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => tagMutationSchema.parse(input))
	.handler(({ data }) => {
		const snapshotResult = readTaskIndexSnapshot();

		if (!snapshotResult.health.isReady || snapshotResult.snapshot === null) {
			throw new Error('task indexes are unavailable');
		}

		const taskByKey = createTaskLookup(snapshotResult.snapshot.meta.tasks);
		const task = taskByKey.get(data.taskKey) ?? null;

		if (!task) {
			throw new Error('task not found');
		}

		const result = updateTaskTagsInFilesystem(task, {
			action: data.action,
			tag: data.tag,
		});

		return {
			taskKey: data.taskKey,
			tags: result.tags,
		};
	});

export const updateTaskTitle = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => titleMutationSchema.parse(input))
	.handler(({ data }) => {
		const snapshotResult = readTaskIndexSnapshot();

		if (!snapshotResult.health.isReady || snapshotResult.snapshot === null) {
			throw new Error('task indexes are unavailable');
		}

		const taskByKey = createTaskLookup(snapshotResult.snapshot.meta.tasks);
		const task = taskByKey.get(data.taskKey) ?? null;

		if (!task) {
			throw new Error('task not found');
		}

		const result = updateTaskTitleInFilesystem(task, {
			title: data.title,
		});

		return {
			taskKey: data.taskKey,
			title: result.title,
		};
	});
