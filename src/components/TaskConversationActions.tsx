import type { Doc } from 'convex/_generated/dataModel';
import { Archive, CheckCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { AddBudgetButton } from '~/components/AddBudgetButton';
import { Button } from '~/components/ui/button';
import { LoadingButton } from '~/components/ui/loading-button';

interface TaskConversationActionsProps {
	task: Doc<'tasks'>;
	onToggleList?: () => void;
	isTaskListVisible: boolean;
	isResolving: boolean;
	isDiscarding: boolean;
	resolve: (args: { taskId: Doc<'tasks'>['_id'] }) => void;
	discard: (args: { taskId: Doc<'tasks'>['_id'] }) => void;
}

export function TaskConversationActions({
	task,
	onToggleList,
	isTaskListVisible,
	isResolving,
	isDiscarding,
	resolve,
	discard,
}: TaskConversationActionsProps) {
	//
	return (
		<div className="flex gap-2">
			{onToggleList && (
				<Button
					size="sm"
					variant="ghost"
					onClick={onToggleList}
					className="hidden md:flex items-center gap-1"
					title={isTaskListVisible ? 'Hide task list' : 'Show task list'}
				>
					{isTaskListVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
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
					<AddBudgetButton amount={0.5} text="Reopen with $0.50" />
					<AddBudgetButton amount={2} variant="outline" text="Reopen with $2.00" />
					<AddBudgetButton amount={5} variant="outline" text="Reopen with $5.00" />
				</>
			)}
		</div>
	);
}
