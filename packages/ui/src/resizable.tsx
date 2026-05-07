import { useState, type ComponentProps } from 'react';
import * as ResizablePrimitive from 'react-resizable-panels';

import { DragHandleDots2Icon } from '@radix-ui/react-icons';
import { cn } from './lib/utils';

const ResizablePanelGroup = ({ className, ...props }: ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
	<ResizablePrimitive.PanelGroup
		className={cn('flex h-full w-full data-[panel-group-direction=vertical]:flex-col', className)}
		{...props}
	/>
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
	withHandle,
	className,
	onDragging,
	...props
}: ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
	withHandle?: boolean;
}) => {
	//
	const [isDragging, setIsDragging] = useState(false);

	const handleDragging = (nextIsDragging: boolean) => {
		setIsDragging(nextIsDragging);
		onDragging?.(nextIsDragging);
	};

	return (
		<ResizablePrimitive.PanelResizeHandle
			className={cn(
				'relative flex w-px items-center justify-center bg-border before:absolute before:inset-y-0 before:left-1/2 before:w-8 before:-translate-x-1/2 after:absolute after:inset-y-0 after:left-1/2 after:w-1.5 after:-translate-x-1/2 after:transition-colors hover:after:bg-ring/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[dragging=true]:after:bg-ring/20 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:before:left-0 data-[panel-group-direction=vertical]:before:h-8 data-[panel-group-direction=vertical]:before:w-full data-[panel-group-direction=vertical]:before:-translate-y-1/2 data-[panel-group-direction=vertical]:before:translate-x-0 data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1.5 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90',
				className,
			)}
			data-dragging={isDragging}
			hitAreaMargins={{
				coarse: 20,
				fine: 15,
			}}
			onDragging={handleDragging}
			{...props}
		>
			{withHandle && (
				<div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border transition-colors hover:border-ring/40 hover:bg-ring/20">
					<DragHandleDots2Icon className="h-2.5 w-2.5" />
				</div>
			)}
		</ResizablePrimitive.PanelResizeHandle>
	);
};

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
