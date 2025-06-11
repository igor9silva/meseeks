import { convexQuery } from '@convex-dev/react-query';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { cn } from '~/lib/utils';

import { QuickAdd } from '~/components/QuickAdd';
import { TaskConversation } from '~/components/TaskConversation';
import TaskDetail from '~/components/TaskDetail';
import { TaskItem } from '~/components/TaskItem';
import { TaskDetailAndConversation } from '~/components/layout/TaskDetailAndConversation';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { useIsMobile } from '~/hooks/useIsMobile';
import { usePreferences } from '~/hooks/usePreferences';
import { useResizablePanelGroup } from '~/hooks/useResizablePanelGroup';

export function TaskListAndDetail({
	taskId, //
	className,
}: {
	taskId: Id<'tasks'> | 'inbox';
	className?: string;
}) {
	const args = taskId === 'inbox' ? {} : { parentId: taskId };
	const query = convexQuery(api.tasks.public.findAll, args);
	const { data: subtasks } = useSuspenseQuery(query);

	const { selectedSubtaskId } = useSearch({ strict: false });

	const isMobile = useIsMobile();
	const direction = isMobile ? 'vertical' : 'horizontal';

	const { getInboxWidthPercent, setInboxWidthPercent } = usePreferences({ defaultValue: 30 });

	const { getPanelSize, handleLayout } = useResizablePanelGroup({
		getValue: getInboxWidthPercent,
		setValue: setInboxWidthPercent,
		defaultValue: 30,
	});

	const preferredWidthPercent = getPanelSize();

	return (
		<ResizablePanelGroup
			direction={direction}
			onLayout={(sizes) => {
				if (selectedSubtaskId) handleLayout(sizes);
			}}
			className={cn('overflow-hidden', className)}
		>
			<ResizablePanel id="list" order={0} defaultSize={selectedSubtaskId ? preferredWidthPercent : 100}>
				<div className="overflow-auto h-full min-w-0">
					{subtasks.length === 0 && <QuickAdd />}
					{subtasks.map((task) => (
						<Link
							key={task._id}
							to="/$"
							search={
								isMobile
									? undefined
									: { selectedSubtaskId: selectedSubtaskId === task._id ? undefined : task._id }
							}
							params={isMobile ? { _splat: `chat/${task._id}` } : undefined}
							resetScroll={false}
							className="block min-w-0"
						>
							<TaskItem className={cn(selectedSubtaskId === task._id && 'bg-muted')} task={task} />
						</Link>
					))}
				</div>
			</ResizablePanel>
			{selectedSubtaskId && <ResizableHandle withHandle />}
			{selectedSubtaskId && (
				<ResizablePanel id="detail" order={1} defaultSize={100 - preferredWidthPercent}>
					<TaskDetailAndConversation
						list={<TaskDetail taskId={selectedSubtaskId} />}
						detail={<TaskConversation taskId={selectedSubtaskId} />}
					/>
				</ResizablePanel>
			)}
		</ResizablePanelGroup>
	);
}
