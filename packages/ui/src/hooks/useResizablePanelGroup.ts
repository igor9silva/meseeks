import { useDebouncedCallback } from '@tanstack/react-pacer';
import { useRef } from 'react';

interface UseResizablePanelGroupOptions {
	getValue: () => number;
	setValue: (value: number) => void;
	defaultValue?: number;
	debounceMs?: number;
}

export function useResizablePanelGroup({
	getValue,
	setValue,
	defaultValue,
	debounceMs = 500,
}: UseResizablePanelGroupOptions) {
	//
	const isDraggingRef = useRef(false);

	const getPanelSize = () => {
		//
		return getValue() ?? defaultValue;
		//
	};

	const handleResize = useDebouncedCallback(
		(size: number) => {
			//
			if (!size) return;
			setValue(size);
			//
		},
		{ wait: debounceMs },
	);

	const handleLayout = (sizes: number[]) => {
		if (!isDraggingRef.current) return;
		handleResize(sizes[0]);
	};

	const handleDragging = (isDragging: boolean) => {
		isDraggingRef.current = isDragging;
	};

	return {
		getPanelSize,
		handleDragging,
		handleLayout,
	};
}
