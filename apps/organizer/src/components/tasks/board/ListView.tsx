import type { ExplorerTask } from '../taskExplorerTypes';
import { TaskRow } from './TaskRow';
import type { TaskListContext } from './taskListTypes';

export function ListView({ tasks, taskList }: { tasks: ExplorerTask[]; taskList: TaskListContext }) {
	//
	return (
		<div className="divide-y divide-border/80 border-t border-border/80">
			{tasks.map((task) => (
				<TaskRow key={task.key} task={task} taskList={taskList} />
			))}
		</div>
	);
}
