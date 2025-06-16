import { useCallback, useRef } from 'react';

export function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
	//
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

	return useCallback(
		(...args: Parameters<T>) => {
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
