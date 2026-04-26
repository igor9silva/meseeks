import { Link } from '@tanstack/react-router';
import type { Doc } from 'convex/_generated/dataModel';
import {
	Archive,
	CheckCircle,
	CodeXml,
	PanelLeftClose,
	PanelLeftOpen,
	PanelRightClose,
	PanelRightOpen,
} from 'lucide-react';
import { AddBudgetButton } from '~/components/AddBudgetButton';
import { ReopenButton } from '~/components/ReopenButton';
import { Button } from '~/components/ui/button';
import { LoadingButton } from '~/components/ui/loading-button';
import { Toggle } from '~/components/ui/toggle';

interface TaskConversationActionsProps {
	task: Doc<'tasks'>;
	onToggleList?: () => void;
	onToggleTaskDetail?: () => void;
	isTaskListVisible: boolean;
	isTaskDetailVisible: boolean;
	isDebugMode: boolean;
	isResolving: boolean;
	isDiscarding: boolean;
	resolve: (args: { taskId: Doc<'tasks'>['_id'] }) => void;
	discard: (args: { taskId: Doc<'tasks'>['_id'] }) => void;
}

export function TaskConversationActions({
	task,
	onToggleList,
	onToggleTaskDetail,
	isTaskListVisible,
	isTaskDetailVisible,
	isDebugMode,
	isResolving,
	isDiscarding,
	resolve,
	discard,
}: TaskConversationActionsProps) {
	//
	return (
		<div className="flex w-full items-center justify-between gap-2">
			<div className="flex gap-2">
				{onToggleList && (
					<Button
						size="sm"
						variant="ghost"
						onClick={onToggleList}
						className="hidden md:flex items-center gap-1"
						title={isTaskListVisible ? 'Hide task list' : 'Show task list'}
						aria-label={isTaskListVisible ? 'Hide task list' : 'Show task list'}
					>
						{isTaskListVisible ? (
							<PanelLeftClose className="h-4 w-4" />
						) : (
							<PanelLeftOpen className="h-4 w-4" />
						)}
					</Button>
				)}
				{task.isActive ? (
					<>
						<LoadingButton
							size="sm"
							variant="ghost"
							onClick={() => {
								if (isResolving) return;
								resolve({ taskId: task._id });
							}}
							loading={isResolving}
							loadingText="Resolving..."
							icon={<CheckCircle className="mr-2 h-4 w-4" />}
							className="flex items-center"
						>
							Resolve
						</LoadingButton>
						<LoadingButton
							size="sm"
							variant="ghost"
							onClick={() => {
								if (isDiscarding) return;
								discard({ taskId: task._id });
							}}
							loading={isDiscarding}
							loadingText="Discarding..."
							icon={<Archive className="mr-2 h-4 w-4" />}
							className="flex items-center"
						>
							Discard
						</LoadingButton>
					</>
				) : (
					<>
						<ReopenButton />
						<AddBudgetButton amount={0.2} text="Reopen with $0.20" />
					</>
				)}
			</div>
			<div className="hidden md:flex items-center gap-2">
				<Link to="/$" search={(prev) => ({ ...prev, debug: isDebugMode ? undefined : true })}>
					<Toggle
						aria-label="Toggle Dev Mode (former Debug)"
						pressed={isDebugMode}
						className="h-8 px-2 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
					>
						<CodeXml className="h-4 w-4 mr-1" />
						Dev Mode
					</Toggle>
				</Link>
				{onToggleTaskDetail && (
					<Button
						size="sm"
						variant="ghost"
						onClick={onToggleTaskDetail}
						className="flex items-center gap-1"
						title={isTaskDetailVisible ? 'Hide task detail' : 'Show task detail'}
						aria-label={isTaskDetailVisible ? 'Hide task detail' : 'Show task detail'}
					>
						{isTaskDetailVisible ? (
							<PanelRightClose className="h-4 w-4" />
						) : (
							<PanelRightOpen className="h-4 w-4" />
						)}
					</Button>
				)}
			</div>
		</div>
	);
}
