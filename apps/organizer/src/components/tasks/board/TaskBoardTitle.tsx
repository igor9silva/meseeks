import { Maximize2, Minimize2 } from 'lucide-react';
import { BoardColumnsDialog } from './BoardColumnsDialog';
import type { TaskBoardHeaderActions, TaskBoardHeaderState } from './TaskBoardHeaderTypes';

export function TaskBoardTitle({ state, actions }: { state: TaskBoardHeaderState; actions: TaskBoardHeaderActions }) {
	//
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
			<div className="min-w-0">
				<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
					<h2 className="text-lg font-semibold">Subtasks</h2>
					<span className="text-xs text-muted-foreground">
						{state.totals?.visible ?? 0} visible / {state.totals?.all ?? 0} total
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<BoardColumnsDialog columns={state.config.columns} onColumnsChange={actions.onColumnsChange} />
				<button
					type="button"
					aria-label={state.isExpanded ? 'Collapse subtasks panel' : 'Expand subtasks panel'}
					title={state.isExpanded ? 'Collapse subtasks panel' : 'Expand subtasks panel'}
					onClick={actions.onExpandedToggle}
					className="inline-flex size-8 items-center justify-center rounded-md border border-border/80 bg-background text-foreground/80 hover:border-foreground/40 hover:text-foreground"
				>
					{state.isExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
				</button>
			</div>
		</div>
	);
}
