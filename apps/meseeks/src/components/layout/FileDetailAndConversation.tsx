import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@reactor/ui/resizable';
import { useFileDetailWidthPercentDesktopPreference } from '~/hooks/preferences';
import { useResizablePanelGroup } from '@reactor/ui/hooks/useResizablePanelGroup';
import { cn } from '@reactor/ui/lib/utils';

export function FileDetailAndConversation({
	list,
	detail,
	className,
	defaultListSize = 70,
	onToggleFileDetail,
}: {
	list: React.ReactNode;
	detail?: React.ReactNode;
	defaultListSize?: number;
	className?: string;
	onToggleFileDetail?: () => void;
}) {
	//
	const {
		getFileDetailWidthPercentDesktop, //
		setFileDetailWidthPercentDesktop,
	} = useFileDetailWidthPercentDesktopPreference({ defaultValue: defaultListSize });

	const { getPanelSize, handleDragging, handleLayout } = useResizablePanelGroup({
		getValue: getFileDetailWidthPercentDesktop,
		setValue: setFileDetailWidthPercentDesktop,
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
						onClick={onToggleFileDetail}
						onDragging={handleDragging}
					/>
				)}
				{shouldRenderListPanel && (
					<ResizablePanel
						key="file-detail-panel"
						id="file-detail"
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
