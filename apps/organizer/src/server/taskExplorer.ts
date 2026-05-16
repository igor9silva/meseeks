import { createServerFn } from '@tanstack/react-start';
import { buildExplorerSnapshot, buildTaskDetail, createTaskLookup } from '~/server/taskExplorerReadModel';
import {
	type CreateTaskInput,
	type DetailQuery,
	createTaskInputSchema,
	detailQuerySchema,
	explorerQuerySchema,
	moveTaskInputSchema,
	priorityMutationSchema,
	renameTaskInputSchema,
	tagMutationSchema,
	titleMutationSchema,
	updateTaskSourceInputSchema,
} from '~/server/taskExplorerSchemas';

export type { CreateTaskInput } from '~/server/taskExplorerSchemas';

async function readTaskIndexSnapshot() {
	//
	const repository = await import('~/server/taskIndexRepository');
	return repository.readTaskIndexSnapshot();
}

async function mergeStatusOptions(statusOptions: string[]): Promise<string[]> {
	//
	const repository = await import('~/server/taskMutationRepository');
	const statuses = new Set<string>();

	for (const status of statusOptions.concat(repository.listTaskStatuses())) {
		statuses.add(status);
	}

	return Array.from(statuses).sort((left, right) => left.localeCompare(right));
}

async function findTaskByKey(input: DetailQuery) {
	//
	const snapshotResult = await readTaskIndexSnapshot();

	if (!snapshotResult.health.isReady || snapshotResult.snapshot === null) {
		throw new Error('task indexes are unavailable');
	}

	const taskByKey = createTaskLookup(snapshotResult.snapshot.meta.tasks);
	const task = taskByKey.get(input.taskKey) ?? null;

	if (!task) {
		throw new Error('task not found');
	}

	return task;
}

export const getExplorerSnapshot = createServerFn({ method: 'GET' })
	.inputValidator((input: unknown) => explorerQuerySchema.parse(input))
	.handler(async ({ data }) => {
		const snapshot = buildExplorerSnapshot(await readTaskIndexSnapshot(), data);

		return {
			...snapshot,
			statusOptions: await mergeStatusOptions(snapshot.statusOptions),
		};
	});

export const getTaskDetail = createServerFn({ method: 'GET' })
	.inputValidator((input: unknown) => detailQuerySchema.parse(input))
	.handler(async ({ data }) => buildTaskDetail(await readTaskIndexSnapshot(), data.taskKey));

export const createTask = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => createTaskInputSchema.parse(input))
	.handler(async ({ data }: { data: CreateTaskInput }) => {
		const repository = await import('~/server/taskMutationRepository');
		const result = repository.createTask(data);

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
	.handler(async ({ data }) => {
		const repository = await import('~/server/taskMutationRepository');
		const task = await findTaskByKey(data);
		const result = repository.markTaskDone(task);

		return {
			oldTaskKey: data.taskKey,
			newTaskKey: result.newTaskKey,
			newRelativePath: result.newRelativePath,
		};
	});

export const moveTask = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => moveTaskInputSchema.parse(input))
	.handler(async ({ data }) => {
		const repository = await import('~/server/taskMutationRepository');
		const task = await findTaskByKey(data);
		const result = repository.moveTask(task, {
			status: data.status,
		});

		return {
			oldTaskKey: data.taskKey,
			newTaskKey: result.newTaskKey,
			newRelativePath: result.newRelativePath,
			status: result.status,
		};
	});

export const trashTask = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => detailQuerySchema.parse(input))
	.handler(async ({ data }) => {
		const repository = await import('~/server/taskMutationRepository');
		const task = await findTaskByKey(data);
		const result = repository.trashTask(task);

		return {
			oldTaskKey: data.taskKey,
			trashedPath: result.trashedPath,
		};
	});

export const updateTaskSource = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => updateTaskSourceInputSchema.parse(input))
	.handler(async ({ data }) => {
		const repository = await import('~/server/taskMutationRepository');
		const task = await findTaskByKey(data);
		const result = repository.updateTaskSource(task, {
			taskSource: data.taskSource,
		});

		return {
			oldTaskKey: data.taskKey,
			newTaskKey: result.newTaskKey,
			newRelativePath: result.newRelativePath,
			taskSource: result.taskSource,
		};
	});

export const renameTask = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => renameTaskInputSchema.parse(input))
	.handler(async ({ data }) => {
		const repository = await import('~/server/taskMutationRepository');
		const task = await findTaskByKey(data);
		const result = repository.renameTask(task, {
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
	.handler(async ({ data }) => {
		const repository = await import('~/server/taskMutationRepository');
		const task = await findTaskByKey(data);
		const result = repository.updateTaskTags(task, {
			action: data.action,
			tag: data.tag,
		});

		return {
			taskKey: data.taskKey,
			tags: result.tags,
		};
	});

export const updateTaskPriority = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => priorityMutationSchema.parse(input))
	.handler(async ({ data }) => {
		const repository = await import('~/server/taskMutationRepository');
		const task = await findTaskByKey(data);
		const result = repository.updateTaskPriority(task, {
			priority: data.priority,
		});

		return {
			taskKey: data.taskKey,
			priority: result.priority,
		};
	});

export const updateTaskTitle = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => titleMutationSchema.parse(input))
	.handler(async ({ data }) => {
		const repository = await import('~/server/taskMutationRepository');
		const task = await findTaskByKey(data);
		const result = repository.updateTaskTitle(task, {
			title: data.title,
		});

		return {
			taskKey: data.taskKey,
			title: result.title,
		};
	});
