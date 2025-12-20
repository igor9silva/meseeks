import { useCallback, useRef } from 'react';

export function useDebounce<TArgs extends Array<unknown>>(
	fn: (...args: TArgs) => void,
	delay: number,
) {
	//
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	return useCallback(
		(...args: TArgs) => {
			//
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => {
				fn(...args);
			}, delay);
		},
		[fn, delay],
	);
}
