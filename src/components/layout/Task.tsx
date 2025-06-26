import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { QuickAdd } from '~/components/QuickAdd';
import { TaskConversation } from '~/components/TaskConversation';
import TaskDetail from '~/components/TaskDetail';
import { TaskItem } from '~/components/TaskItem';
import { TaskDetailAndConversation } from '~/components/layout/TaskDetailAndConversation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { useIsMobile } from '~/hooks/useIsMobile';
import { usePreferences } from '~/hooks/usePreferences';
import { useResizablePanelGroup } from '~/hooks/useResizablePanelGroup';
import { cn } from '~/lib/utils';

export function Task({
	taskId,
	parentTaskId = 'inbox',
	className,
}: {
	taskId: Id<'tasks'>;
	parentTaskId?: Id<'tasks'> | 'inbox';
	className?: string;
}) {
	//
	const args = parentTaskId === 'inbox' ? {} : { parentId: parentTaskId };
	const query = convexQuery(api.tasks.public.findAll, args);
	const { data: subtasks } = useSuspenseQuery(query);

	const isMobile = useIsMobile();
	const direction = isMobile ? 'vertical' : 'horizontal';

	const { getInboxWidthPercent, setInboxWidthPercent } = usePreferences({ defaultValue: 25 });

	const { getPanelSize, handleLayout } = useResizablePanelGroup({
		getValue: getInboxWidthPercent,
		setValue: setInboxWidthPercent,
	});

	const preferredWidthPercent = getPanelSize();

	return (
		<ResizablePanelGroup direction={direction} onLayout={handleLayout} className={cn('overflow-hidden', className)}>
			<ResizablePanel id="list" order={0} defaultSize={preferredWidthPercent} minSize={25}>
				<div className="overflow-auto h-full">
					{subtasks.length === 0 && <QuickAdd />}
					{subtasks.map((task) => (
						<Link
							key={task._id}
							to="/$"
							params={{ _splat: `/task/${task._id}` }}
							resetScroll={false}
							className="block min-w-0"
						>
							<TaskItem className={cn(taskId === task._id && 'bg-muted')} task={task} />
						</Link>
					))}
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel id="detail" order={1} defaultSize={100 - preferredWidthPercent} minSize={25}>
				<TaskDetailAndConversation
					list={<TaskDetail taskId={taskId} />}
					detail={<TaskConversation taskId={taskId} />}
				/>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
