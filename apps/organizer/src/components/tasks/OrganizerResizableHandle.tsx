import { ResizableHandle } from '@reactor/ui/resizable';

export function OrganizerResizableHandle({ onDragging }: { onDragging: (isDragging: boolean) => void }) {
	//
	return <ResizableHandle onDragging={onDragging} />;
}
