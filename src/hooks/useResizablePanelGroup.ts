import { useCallback } from 'react';
import { useDebounce } from './useDebounce';

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

	const { call } = useDebounce((size: number) => {
		//
		if (!size) return;
		setValue(size);
		//
	}, debounceMs);

	const handleLayout = useCallback(
		(sizes: number[]) => {
			call(sizes[0]);
		},
		[call],
	);

	return {
		getPanelSize,
		handleLayout,
	};
}
