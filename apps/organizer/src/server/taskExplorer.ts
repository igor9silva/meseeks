import { createServerFn } from '@tanstack/react-start';
import { createTaskLookup } from '~/server/taskExplorerLookup';
import { buildExplorerSnapshot, buildTaskDetail } from '~/server/taskExplorerReadModel';
import {
	type CreateTaskInput,
	type DetailQuery,
	type PathQuery,
	createTaskInputSchema,
	detailQuerySchema,
	explorerQuerySchema,
	pathQuerySchema,
	priorityMutationSchema,
	renameTaskInputSchema,
	statusMutationSchema,
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

function createTaskKey(input: PathQuery): string {
	//
	return `${input.taskSource}:${input.taskPath}`;
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
	.handler(async ({ data }) => buildExplorerSnapshot(await readTaskIndexSnapshot(), data));

export const getTaskDetail = createServerFn({ method: 'GET' })
	.inputValidator((input: unknown) => detailQuerySchema.parse(input))
	.handler(async ({ data }) => buildTaskDetail(await readTaskIndexSnapshot(), data.taskKey));

export const getTaskByPath = createServerFn({ method: 'GET' })
	.inputValidator((input: unknown) => pathQuerySchema.parse(input))
	.handler(async ({ data }) => buildTaskDetail(await readTaskIndexSnapshot(), createTaskKey(data)));

export const createTask = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => createTaskInputSchema.parse(input))
	.handler(async ({ data }: { data: CreateTaskInput }) => {
		const repository = await import('~/server/taskMutationRepository');
		const result = repository.createTask(data);

		return {
			absolutePath: result.absolutePath,
			newRelativePath: result.newRelativePath,
			newTaskKey: result.newTaskKey,
			taskPath: result.taskPath,
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
			status: result.status,
		};
	});

export const moveTask = createServerFn({ method: 'POST' })
	.inputValidator((input: unknown) => statusMutationSchema.parse(input))
	.handler(async ({ data }) => {
		const repository = await import('~/server/taskMutationRepository');
		const task = await findTaskByKey(data);
		const result = repository.moveTask(task, {
			status: data.status,
		});

		return {
			oldTaskKey: data.taskKey,
			newTaskKey: result.newTaskKey,
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
			newTaskPath: result.newTaskPath,
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
