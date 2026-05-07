import { Id } from 'convex/_generated/dataModel';
import { Suspense } from 'react';
import { TaskList } from '~/components/Inbox';
import { Loading } from '~/components/Loading';
import { TaskConversation } from '~/components/TaskConversation';
import TaskDetail from '~/components/TaskDetail';
import { TaskDetailAndConversation } from '~/components/layout/TaskDetailAndConversation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@reactor/ui/resizable';
import { useCurrentTaskId } from '~/hooks/useCurrentTask';
import {
	useInboxWidthPercentPreference,
	useTaskDetailVisiblePreference,
	useTaskListVisiblePreference,
} from '~/hooks/preferences';
import { useResizablePanelGroup } from '@reactor/ui/hooks/useResizablePanelGroup';
import { cn } from '@reactor/ui/lib/utils';

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
		getInboxWidthPercent, //
		setInboxWidthPercent,
	} = useInboxWidthPercentPreference({ defaultValue: 25 });

	const {
		isTaskListVisible, //
		setIsTaskListVisible,
	} = useTaskListVisiblePreference();

	const {
		isTaskDetailVisible, //
		setIsTaskDetailVisible,
	} = useTaskDetailVisiblePreference();

	const { getPanelSize, handleDragging, handleLayout } = useResizablePanelGroup({
		getValue: getInboxWidthPercent,
		setValue: setInboxWidthPercent,
	});

	const preferredWidthPercent = getPanelSize();

	return (
		<ResizablePanelGroup
			direction="horizontal"
			onLayout={isTaskListVisible ? handleLayout : undefined}
			className={cn('overflow-hidden', className)}
		>
			{isTaskListVisible && (
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
			{isTaskListVisible && (
				<ResizableHandle
					className="hidden md:flex"
					onClick={() => setIsTaskListVisible(!isTaskListVisible)}
					onDragging={handleDragging}
				/>
			)}
			<ResizablePanel
				key="task-content-panel"
				id="detail"
				order={1}
				defaultSize={isTaskListVisible ? 100 - preferredWidthPercent : 100}
				minSize={15}
				className="max-md:!flex-1"
			>
				<Suspense fallback={<Loading />}>
					<TaskDetailWithConditionalRendering
						onToggleList={() => setIsTaskListVisible(!isTaskListVisible)}
						onToggleTaskDetail={() => setIsTaskDetailVisible(!isTaskDetailVisible)}
						isTaskListVisible={isTaskListVisible}
						isTaskDetailVisible={isTaskDetailVisible}
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
