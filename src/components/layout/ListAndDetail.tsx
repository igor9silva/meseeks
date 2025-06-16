import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable';
import { useIsMobile } from '~/hooks/useIsMobile';
import { cn } from '~/lib/utils';

export function ListAndDetail({
	list,
	detail,
	className,
	defaultListSize = 30,
}: {
	list: React.ReactNode;
	detail?: React.ReactNode;
	defaultListSize?: number;
	className?: string;
}) {
	const isMobile = useIsMobile();
	const direction = isMobile ? 'vertical' : 'horizontal';

	return (
		<ResizablePanelGroup direction={direction} className={cn('overflow-hidden', className)}>
			<ResizablePanel id="list" order={0} defaultSize={detail ? defaultListSize : 100}>
				{list}
			</ResizablePanel>
			{detail && <ResizableHandle withHandle />}
			{detail && (
				<ResizablePanel id="detail" order={1} defaultSize={100 - defaultListSize}>
					{detail}
				</ResizablePanel>
			)}
		</ResizablePanelGroup>
	);
}
