import { useCallback, useRef, type TouchEvent } from 'react';

const DOUBLE_TAP_DELAY_MS = 300;

export function useDoubleTap(callback: (event: TouchEvent) => void) {
	//
	const lastTouchAtRef = useRef(0);

	return useCallback(
		(event: TouchEvent) => {
			//
			const now = Date.now();
			const hasDoubleTapped = now - lastTouchAtRef.current < DOUBLE_TAP_DELAY_MS;

			if (!hasDoubleTapped) {
				lastTouchAtRef.current = now;
				return;
			}

			lastTouchAtRef.current = 0;
			callback(event);
		},
		[callback],
	);
}
