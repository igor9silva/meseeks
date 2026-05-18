import { Badge } from '@reactor/ui';
import type { ExplorerTask } from '../taskExplorerTypes';
import { TaskRow } from './TaskRow';
import type { TaskListContext } from './taskListTypes';

export function TaskColumn({
	title,
	tasks,
	taskList,
}: {
	title: string;
	tasks: ExplorerTask[];
	taskList: TaskListContext;
}) {
	//
	return (
		<section className="min-h-64 min-w-72 flex-1 border-b border-r border-border/80 last:border-r-0 sm:border-b-0">
			<header className="sticky top-0 z-10 border-b border-border/80 bg-card/95 px-3 py-2">
				<div className="flex items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2">
						<h2 className="truncate text-sm font-semibold">{title}</h2>
					</div>
					<Badge variant="outline" className="shrink-0 rounded-md px-1.5 py-0 text-xs tabular-nums">
						{tasks.length}
					</Badge>
				</div>
			</header>

			<div className="divide-y divide-border/80">
				{tasks.length === 0 ? (
					<div className="px-3 py-4 text-xs text-muted-foreground">No visible tasks.</div>
				) : null}
				{tasks.map((task) => (
					<TaskRow key={task.key} task={task} taskList={taskList} />
				))}
			</div>
		</section>
	);
}
