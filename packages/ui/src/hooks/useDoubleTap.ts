import { useRef, type TouchEvent } from 'react';

const DOUBLE_TAP_DELAY_MS = 300;

export function useDoubleTap(callback: (event: TouchEvent) => void) {
	//
	const lastTouchAtRef = useRef(0);
	const lastTouchTargetRef = useRef<EventTarget | null>(null);

	return (event: TouchEvent) => {
		//
		const now = Date.now();
		const hasDoubleTapped = now - lastTouchAtRef.current < DOUBLE_TAP_DELAY_MS;
		const hasSameTarget = event.target === lastTouchTargetRef.current;

		if (!hasDoubleTapped || !hasSameTarget) {
			lastTouchAtRef.current = now;
			lastTouchTargetRef.current = event.target;
			return;
		}

		lastTouchAtRef.current = 0;
		lastTouchTargetRef.current = null;
		callback(event);
	};
}
