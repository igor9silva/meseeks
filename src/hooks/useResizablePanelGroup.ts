import { useDebouncedCallback } from '@tanstack/react-pacer';
import { useCallback } from 'react';

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
	const getPanelSize = useCallback(() => {
		//
		return getValue() ?? defaultValue;
		//
	}, [getValue, defaultValue]);

	const handleResize = useDebouncedCallback((size: number) => {
		//
		if (!size) return;
		setValue(size);
		//
	}, { wait: debounceMs });

	const handleLayout = useCallback(
		(sizes: number[]) => {
			handleResize(sizes[0]);
		},
		[handleResize],
	);

	return {
		getPanelSize,
		handleLayout,
	};
}
