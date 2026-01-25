import { useCallback, useRef } from 'react';

type DebouncedFn<T extends unknown[]> = (...args: T) => void;

type UseDebounceReturn<T extends unknown[]> = {
	call: DebouncedFn<T>;
	cancel: () => void;
	flush: () => void;
	isPending: boolean;
};

export function useDebounce<T extends unknown[]>(fn: DebouncedFn<T>, wait: number): UseDebounceReturn<T> {
	//
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingArgsRef = useRef<T | null>(null);
	const fnRef = useRef(fn);
	fnRef.current = fn;

	const cancel = useCallback(() => {
		//
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		pendingArgsRef.current = null;
	}, []);

	const flush = useCallback(() => {
		//
		if (timerRef.current && pendingArgsRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
			fnRef.current(...pendingArgsRef.current);
			pendingArgsRef.current = null;
		}
	}, []);

	const call = useCallback(
		(...args: T) => {
			//
			cancel();
			pendingArgsRef.current = args;
			timerRef.current = setTimeout(() => {
				fnRef.current(...args);
				pendingArgsRef.current = null;
				timerRef.current = null;
			}, wait);
		},
		[wait, cancel],
	);

	return {
		call,
		cancel,
		flush,
		isPending: pendingArgsRef.current !== null,
	};
}
