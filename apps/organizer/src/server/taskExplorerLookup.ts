import type { TaskSummary } from '~/server/taskIndexSchemas';

export function createTaskLookup(tasks: TaskSummary[]): Map<string, TaskSummary> {
	//
	const taskByKey = new Map<string, TaskSummary>();

	for (const task of tasks) {
		taskByKey.set(task.key, task);
	}

	return taskByKey;
}
