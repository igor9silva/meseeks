import { ResizableHandle } from '@pro/ui/resizable';

export function OrganizerResizableHandle({ onDragging }: { onDragging: (isDragging: boolean) => void }) {
	//
	return <ResizableHandle onDragging={onDragging} />;
}
