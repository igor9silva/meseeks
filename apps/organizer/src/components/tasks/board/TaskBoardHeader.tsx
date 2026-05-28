import { IndexUnavailable } from './IndexUnavailable';
import { TagFilterPanel } from './TagFilterPanel';
import { TaskBoardTitle } from './TaskBoardTitle';
import { TaskBoardToolbar } from './TaskBoardToolbar';
import type { TaskBoardHeaderActions, TaskBoardHeaderState } from './TaskBoardHeaderTypes';

export type { TaskBoardHeaderActions, TaskBoardHeaderState } from './TaskBoardHeaderTypes';

export function TaskBoardHeader({ state, actions }: { state: TaskBoardHeaderState; actions: TaskBoardHeaderActions }) {
	//
	return (
		<header className="border-b border-border/80 bg-card/95">
			<TaskBoardTitle state={state} actions={actions} />
			<IndexUnavailable state={state} />
			<TaskBoardToolbar state={state} actions={actions} />
			<TagFilterPanel state={state} actions={actions} />
		</header>
	);
}
