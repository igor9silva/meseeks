import { Id } from 'convex/_generated/dataModel';
import { Suspense } from 'react';
import { TaskList } from '~/components/Inbox';
import { Loading } from '~/components/Loading';
import { TaskConversation } from '~/components/TaskConversation';
import TaskDetail from '~/components/TaskDetail';
import { TaskDetailAndConversation } from '~/components/layout/TaskDetailAndConversation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { useCurrentTaskId } from '~/hooks/useCurrentTask';
import { usePreferences } from '~/hooks/usePreferences';
import { useResizablePanelGroup } from '~/hooks/useResizablePanelGroup';
import { cn } from '~/lib/utils';

interface TaskProps {
	parentTaskId?: Id<'tasks'> | 'inbox';
	className?: string;
}

export function Task(props: TaskProps) {
	//
	return (
		<Suspense fallback={<Loading />}>
			<TaskContent {...props} />
		</Suspense>
	);
}

function TaskContent({ parentTaskId = 'inbox', className }: TaskProps) {
	//
	const {
		getInboxWidthPercent,
		setInboxWidthPercent,
		getIsTaskListVisible,
		setIsTaskListVisible,
		getIsTaskDetailVisible,
		setIsTaskDetailVisible,
	} = usePreferences({ defaultValue: 25 });

	const { getPanelSize, handleDragging, handleLayout } = useResizablePanelGroup({
		getValue: getInboxWidthPercent,
		setValue: setInboxWidthPercent,
	});

	const preferredWidthPercent = getPanelSize();
	const isTaskListPreferredVisible = getIsTaskListVisible();
	const isTaskDetailPreferredVisible = getIsTaskDetailVisible();

	const handleToggleList = () => {
		//
		setIsTaskListVisible(!isTaskListPreferredVisible);
	};

	const handleToggleTaskDetail = () => {
		//
		setIsTaskDetailVisible(!isTaskDetailPreferredVisible);
	};

	return (
		<ResizablePanelGroup
			direction="horizontal"
			onLayout={isTaskListPreferredVisible ? handleLayout : undefined}
			className={cn('overflow-hidden', className)}
		>
			{isTaskListPreferredVisible && (
				<ResizablePanel
					key="task-list-panel"
					id="list"
					order={0}
					defaultSize={preferredWidthPercent}
					minSize={15}
					className="hidden md:block"
				>
					<Suspense fallback={<Loading />}>
						<TaskListWrapper parentTaskId={parentTaskId} />
					</Suspense>
				</ResizablePanel>
			)}
			{isTaskListPreferredVisible && (
				<ResizableHandle
					className="hidden md:flex"
					onClick={handleToggleList}
					onDragging={handleDragging}
				/>
			)}
			<ResizablePanel
				key="task-content-panel"
				id="detail"
				order={1}
				defaultSize={isTaskListPreferredVisible ? 100 - preferredWidthPercent : 100}
				minSize={15}
				className="max-md:!flex-1"
			>
				<Suspense fallback={<Loading />}>
					<TaskDetailWithConditionalRendering
						onToggleList={handleToggleList}
						onToggleTaskDetail={handleToggleTaskDetail}
						isTaskListVisible={isTaskListPreferredVisible}
						isTaskDetailVisible={isTaskDetailPreferredVisible}
					/>
				</Suspense>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

function TaskDetailWithConditionalRendering({
	onToggleList,
	onToggleTaskDetail,
	isTaskListVisible,
	isTaskDetailVisible,
}: {
	onToggleList?: () => void;
	onToggleTaskDetail?: () => void;
	isTaskListVisible: boolean;
	isTaskDetailVisible: boolean;
}) {
	//
	return (
		<TaskDetailAndConversation
			list={isTaskDetailVisible ? <TaskDetail /> : undefined}
			detail={
				<TaskConversation
					onToggleList={onToggleList}
					onToggleTaskDetail={onToggleTaskDetail}
					isTaskListVisible={isTaskListVisible}
					isTaskDetailVisible={isTaskDetailVisible}
				/>
			}
			onToggleTaskDetail={onToggleTaskDetail}
		/>
	);
}

function TaskListWrapper({ parentTaskId = 'inbox' }: { parentTaskId?: Id<'tasks'> | 'inbox' }) {
	//
	const currentTaskId = useCurrentTaskId();

	return <TaskList parentTaskId={parentTaskId} currentTaskId={currentTaskId} />;
}
