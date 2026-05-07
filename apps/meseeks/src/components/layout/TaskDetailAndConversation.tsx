import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@reactor/ui/resizable';
import { usePreferences } from '~/hooks/usePreferences';
import { useResizablePanelGroup } from '@reactor/ui/hooks/useResizablePanelGroup';
import { cn } from '@reactor/ui/lib/utils';

export function TaskDetailAndConversation({
	list,
	detail,
	className,
	defaultListSize = 70,
	onToggleTaskDetail,
}: {
	list: React.ReactNode;
	detail?: React.ReactNode;
	defaultListSize?: number;
	className?: string;
	onToggleTaskDetail?: () => void;
}) {
	//
	const { getTaskDetailWidthPercentDesktop: getWidthDesktop, setTaskDetailWidthPercentDesktop: setWidthDesktop } =
		usePreferences({ defaultValue: defaultListSize });

	const { getPanelSize, handleDragging, handleLayout } = useResizablePanelGroup({
		getValue: getWidthDesktop,
		setValue: setWidthDesktop,
	});

	const panelSize = getPanelSize() ?? defaultListSize;
	const shouldRenderListPanel = Boolean(list);

	return (
		<div className={cn('h-full w-full', className)}>
			<ResizablePanelGroup
				direction="horizontal"
				className={cn('overflow-hidden', className)}
				onLayout={shouldRenderListPanel ? handleLayout : undefined}
			>
				<ResizablePanel
					key="conversation-panel"
					id="conversation"
					order={0}
					defaultSize={shouldRenderListPanel ? panelSize : 100}
					minSize={25}
					className="max-md:!flex-1"
				>
					{detail}
				</ResizablePanel>
				{shouldRenderListPanel && (
					<ResizableHandle
						className="hidden md:flex"
						onClick={onToggleTaskDetail}
						onDragging={handleDragging}
					/>
				)}
				{shouldRenderListPanel && (
					<ResizablePanel
						key="task-detail-panel"
						id="task-detail"
						order={1}
						defaultSize={100 - panelSize}
						minSize={25}
						className="hidden md:block"
					>
						{list}
					</ResizablePanel>
				)}
			</ResizablePanelGroup>
		</div>
	);
}
