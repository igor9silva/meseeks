import { createServerFn } from "@tanstack/react-start";
import {
	buildExplorerSnapshot,
	buildTaskDetail,
	createTaskLookup,
} from "~/server/taskExplorerReadModel";
import {
	type CreateTaskInput,
	createTaskInputSchema,
	detailQuerySchema,
	explorerQuerySchema,
	tagMutationSchema,
} from "~/server/taskExplorerSchemas";
import { readTaskIndexSnapshot } from "~/server/taskIndexRepository";
import {
	createTask as createTaskInFilesystem,
	markTaskDone as markTaskDoneInFilesystem,
	updateTaskTags as updateTaskTagsInFilesystem,
} from "~/server/taskMutationRepository";

export type { CreateTaskInput } from "~/server/taskExplorerSchemas";

export const getExplorerSnapshot = createServerFn({ method: "GET" })
	.inputValidator((input: unknown) => explorerQuerySchema.parse(input))
	.handler(({ data }) => buildExplorerSnapshot(readTaskIndexSnapshot(), data));

export const getTaskDetail = createServerFn({ method: "GET" })
	.inputValidator((input: unknown) => detailQuerySchema.parse(input))
	.handler(({ data }) =>
		buildTaskDetail(readTaskIndexSnapshot(), data.taskKey),
	);

export const createTask = createServerFn({ method: "POST" })
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

export const markTaskDone = createServerFn({ method: "POST" })
	.inputValidator((input: unknown) => detailQuerySchema.parse(input))
	.handler(({ data }) => {
		const snapshotResult = readTaskIndexSnapshot();

		if (!snapshotResult.health.isReady || snapshotResult.snapshot === null) {
			throw new Error("task indexes are unavailable");
		}

		const taskByKey = createTaskLookup(snapshotResult.snapshot.meta.tasks);
		const task = taskByKey.get(data.taskKey) ?? null;

		if (!task) {
			throw new Error("task not found");
		}

		const result = markTaskDoneInFilesystem(task);

		return {
			oldTaskKey: data.taskKey,
			newTaskKey: result.newTaskKey,
			newRelativePath: result.newRelativePath,
		};
	});

export const updateTaskTags = createServerFn({ method: "POST" })
	.inputValidator((input: unknown) => tagMutationSchema.parse(input))
	.handler(({ data }) => {
		const snapshotResult = readTaskIndexSnapshot();

		if (!snapshotResult.health.isReady || snapshotResult.snapshot === null) {
			throw new Error("task indexes are unavailable");
		}

		const taskByKey = createTaskLookup(snapshotResult.snapshot.meta.tasks);
		const task = taskByKey.get(data.taskKey) ?? null;

		if (!task) {
			throw new Error("task not found");
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
