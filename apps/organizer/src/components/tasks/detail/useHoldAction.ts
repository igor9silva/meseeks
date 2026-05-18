import type { PointerEvent } from 'react';
import { useEffect, useRef } from 'react';

const HOLD_ACTION_DELAY_MS = 550;

export function useHoldAction(action: () => void, isDisabled: boolean) {
	//
	const timeoutRef = useRef<number | null>(null);
	const didTriggerRef = useRef(false);

	const clearHoldTimer = () => {
		if (timeoutRef.current === null) return;
		window.clearTimeout(timeoutRef.current);
		timeoutRef.current = null;
	};

	const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
		if (isDisabled) return;
		if (event.pointerType === 'mouse' && event.button !== 0) return;

		clearHoldTimer();
		didTriggerRef.current = false;
		timeoutRef.current = window.setTimeout(() => {
			didTriggerRef.current = true;
			action();
		}, HOLD_ACTION_DELAY_MS);
	};

	const handlePointerEnd = () => {
		clearHoldTimer();
	};

	const shouldSuppressClick = () => {
		if (!didTriggerRef.current) return false;
		didTriggerRef.current = false;
		return true;
	};

	useEffect(() => {
		return () => {
			if (timeoutRef.current === null) return;
			window.clearTimeout(timeoutRef.current);
		};
	}, []);

	return {
		handlePointerDown,
		handlePointerEnd,
		shouldSuppressClick,
	};
}

export type HoldAction = ReturnType<typeof useHoldAction>;
