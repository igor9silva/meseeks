import { Id } from 'convex/_generated/dataModel';
import { Suspense } from 'react';
import { TaskList } from '~/components/Inbox';
import { Loading } from '~/components/Loading';
import { TaskConversation } from '~/components/TaskConversation';
import TaskDetail from '~/components/TaskDetail';
import { TaskDetailAndConversation } from '~/components/layout/TaskDetailAndConversation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { useCurrentTask, useCurrentTaskId } from '~/hooks/useCurrentTask';
import { useIsMobile } from '~/hooks/useIsMobile';
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
	const isMobile = useIsMobile();
	const direction = isMobile ? 'vertical' : 'horizontal';

	const { getInboxWidthPercent, setInboxWidthPercent, getIsTaskListVisible, setIsTaskListVisible } = usePreferences({
		defaultValue: 25,
	});

	const { getPanelSize, handleLayout } = useResizablePanelGroup({
		getValue: getInboxWidthPercent,
		setValue: setInboxWidthPercent,
	});

	const preferredWidthPercent = getPanelSize();
	const isTaskListVisible = getIsTaskListVisible() && !isMobile;

	const handleToggleList = () => {
		//
		setIsTaskListVisible(!isTaskListVisible);
	};

	return (
		<ResizablePanelGroup
			direction={direction}
			onLayout={isTaskListVisible ? handleLayout : undefined}
			className={cn('overflow-hidden', className)}
		>
			{isTaskListVisible && (
				<ResizablePanel
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
			{isTaskListVisible && <ResizableHandle />}
			<ResizablePanel
				id="detail"
				order={1}
				defaultSize={isTaskListVisible ? 100 - preferredWidthPercent : 100}
				minSize={15}
			>
				<Suspense fallback={<Loading />}>
					<TaskDetailWithConditionalRendering
						onToggleList={handleToggleList}
						isTaskListVisible={isTaskListVisible}
					/>
				</Suspense>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

function TaskDetailWithConditionalRendering({
	onToggleList,
	isTaskListVisible,
}: {
	onToggleList: () => void;
	isTaskListVisible: boolean;
}) {
	//
	const { task } = useCurrentTask();
	const taskHasContent = Boolean(task.title?.trim() || task.instructions?.trim());

	return (
		<TaskDetailAndConversation
			list={taskHasContent ? <TaskDetail /> : undefined}
			detail={<TaskConversation onToggleList={onToggleList} isTaskListVisible={isTaskListVisible} />}
		/>
	);
}

function TaskListWrapper({ parentTaskId = 'inbox' }: { parentTaskId?: Id<'tasks'> | 'inbox' }) {
	//
	const currentTaskId = useCurrentTaskId();

	return <TaskList parentTaskId={parentTaskId} currentTaskId={currentTaskId} />;
}
