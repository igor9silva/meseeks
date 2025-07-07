import { Link } from '@tanstack/react-router';
import { Id } from 'convex/_generated/dataModel';
import { Suspense } from 'react';
import { Loading } from '~/components/Loading';
import { QuickAdd } from '~/components/QuickAdd';
import { TaskConversation } from '~/components/TaskConversation';
import TaskDetail from '~/components/TaskDetail';
import { TaskItem } from '~/components/TaskItem';
import { TaskDetailAndConversation } from '~/components/layout/TaskDetailAndConversation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { useSubtasks } from '~/hooks/query/useSubtasks';
import { useCurrentTaskId } from '~/hooks/useCurrentTask';
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
					minSize={25}
					className="hidden md:block"
				>
					<Suspense fallback={<Loading />}>
						<TaskList parentTaskId={parentTaskId} />
					</Suspense>
				</ResizablePanel>
			)}
			{isTaskListVisible && <ResizableHandle withHandle />}
			<ResizablePanel
				id="detail"
				order={1}
				defaultSize={isTaskListVisible ? 100 - preferredWidthPercent : 100}
				minSize={25}
			>
				<Suspense fallback={<Loading />}>
					<TaskDetailAndConversation
						list={<TaskDetail />}
						detail={
							<TaskConversation onToggleList={handleToggleList} isTaskListVisible={isTaskListVisible} />
						}
					/>
				</Suspense>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

function TaskList({ parentTaskId = 'inbox' }: { parentTaskId?: Id<'tasks'> | 'inbox' }) {
	//
	const currentTaskId = useCurrentTaskId();
	const { subtasks } = useSubtasks(parentTaskId === 'inbox' ? undefined : parentTaskId);

	return (
		<div className="overflow-auto h-full">
			{subtasks.length === 0 && <QuickAdd />}
			{subtasks.map((task) => (
				<Link
					key={task._id}
					to="/$"
					params={{ _splat: `/task/${task._id}` }}
					search={(prev) => prev}
					resetScroll={false}
					className="block min-w-0"
				>
					<TaskItem className={cn(currentTaskId === task._id && 'bg-muted')} task={task} />
				</Link>
			))}
		</div>
	);
}
