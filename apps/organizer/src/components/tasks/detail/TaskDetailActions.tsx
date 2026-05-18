import { ArrowRight, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import type { TaskDetailPanelControls } from './TaskDetailHeaderTypes';

interface TaskDetailActionsProps {
	panel: TaskDetailPanelControls;
	isStructural: boolean;
	isTaskFileMutationPending: boolean;
	onTrashTask: () => void;
}

export function TaskDetailActions({
	panel,
	isStructural,
	isTaskFileMutationPending,
	onTrashTask,
}: TaskDetailActionsProps) {
	//
	return (
		<div className="task-detail-actions">
			{panel.onOpenTask ? (
				<Button
					type="button"
					size="icon-sm"
					variant="ghost"
					aria-label="Navigate into task"
					title="Navigate into task"
					onClick={panel.onOpenTask}
				>
					<ArrowRight className="size-4" />
				</Button>
			) : null}
			{panel.onPanelCollapse ? (
				<Button
					type="button"
					size="icon-sm"
					variant="ghost"
					aria-label="Collapse left panel"
					title="Collapse left panel"
					onClick={panel.onPanelCollapse}
				>
					<PanelLeftClose className="size-4" />
				</Button>
			) : null}
			{panel.onPanelExpand ? (
				<Button
					type="button"
					size="icon-sm"
					variant="ghost"
					aria-label="Expand left panel"
					title="Expand left panel"
					onClick={panel.onPanelExpand}
				>
					<PanelLeftOpen className="size-4" />
				</Button>
			) : null}
			<Button
				type="button"
				size="icon-sm"
				variant="ghost"
				aria-label={panel.isInspectorExpanded ? 'Collapse detail panel' : 'Expand detail panel'}
				title={panel.isInspectorExpanded ? 'Collapse detail panel' : 'Expand detail panel'}
				onClick={panel.onInspectorExpandedToggle}
			>
				{panel.isInspectorExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
			</Button>
			{!isStructural ? (
				<Button
					type="button"
					size="icon-sm"
					variant="destructive"
					aria-label="Move to system Trash"
					onClick={onTrashTask}
					disabled={isTaskFileMutationPending}
				>
					<Trash2 className="size-4" />
				</Button>
			) : null}
		</div>
	);
}
