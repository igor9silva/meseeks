import type { TaskConfig } from '~/server/taskIndexSchemas';
import type { ExplorerTask } from '../taskExplorerTypes';
import { groupTasksByColumns } from './boardTasks';
import { TaskColumn } from './TaskColumn';
import type { TaskListContext } from './taskListTypes';

export function BoardView({
	config,
	tasks,
	taskList,
}: {
	config: TaskConfig;
	tasks: ExplorerTask[];
	taskList: TaskListContext;
}) {
	//
	const tasksByColumn = groupTasksByColumns(tasks, config.columns);
	const unsortedTasks = tasksByColumn.get('unsorted') ?? [];
	const visibleColumns = config.columns
		.map((column) => ({
			column,
			tasks: tasksByColumn.get(column.id) ?? [],
		}))
		.filter((entry) => entry.tasks.length > 0);

	return (
		<div className="flex min-h-full min-w-0 border-t border-border/80">
			{visibleColumns.map(({ column, tasks: columnTasks }) => (
				<TaskColumn key={column.id} title={column.label} tasks={columnTasks} taskList={taskList} />
			))}
			{unsortedTasks.length > 0 ? (
				<TaskColumn title="Unsorted" tasks={unsortedTasks} taskList={taskList} />
			) : null}
		</div>
	);
}
