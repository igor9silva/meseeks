import type { TaskConfigColumn } from '~/server/taskIndexSchemas';
import type { ExplorerTask } from '../taskExplorerTypes';

export function groupTasksByColumns(tasks: ExplorerTask[], columns: TaskConfigColumn[]): Map<string, ExplorerTask[]> {
	//
	const tasksByColumn = new Map<string, ExplorerTask[]>();

	for (const column of columns) {
		tasksByColumn.set(column.id, []);
	}

	tasksByColumn.set('unsorted', []);

	for (const task of tasks) {
		const matchingColumn = columns.find((column) => taskMatchesColumn(task, column));
		const columnId = matchingColumn?.id ?? 'unsorted';
		const columnTasks = tasksByColumn.get(columnId);

		if (!columnTasks) {
			tasksByColumn.set(columnId, [task]);
			continue;
		}

		columnTasks.push(task);
	}

	return tasksByColumn;
}

function taskMatchesColumn(task: ExplorerTask, column: TaskConfigColumn): boolean {
	//
	if (column.match.type === 'tag') return task.tags.includes(column.match.tag);
	return task.taskSource === column.match.source;
}
