import { useCallback, useMemo, useRef, type Touch, type TouchEvent } from 'react';

const DOUBLE_TAP_DELAY_MS = 300;
const TAP_MOVE_TOLERANCE_PX = 12;

type TouchPoint = {
	x: number;
	y: number;
};

export function useDoubleTap(callback: (event: TouchEvent) => void) {
	//
	const touchStartRef = useRef<TouchPoint | null>(null);
	const hasMovedRef = useRef(false);
	const lastTapRef = useRef<{ at: number; point: TouchPoint } | null>(null);

	const handleTouchStart = useCallback((event: TouchEvent) => {
		//
		if (event.touches.length !== 1) {
			touchStartRef.current = null;
			hasMovedRef.current = true;
			return;
		}

		const touch = event.touches.item(0);
		if (!touch) return;

		touchStartRef.current = getTouchPoint(touch);
		hasMovedRef.current = false;
	}, []);

	const handleTouchMove = useCallback((event: TouchEvent) => {
		//
		const touchStart = touchStartRef.current;
		const touch = event.touches.item(0);
		if (!touchStart || !touch) return;

		const currentPoint = getTouchPoint(touch);
		if (getDistance(touchStart, currentPoint) > TAP_MOVE_TOLERANCE_PX) hasMovedRef.current = true;
	}, []);

	const handleTouchEnd = useCallback(
		(event: TouchEvent) => {
			//
			const touchStart = touchStartRef.current;
			const touch = event.changedTouches.item(0);
			touchStartRef.current = null;

			if (!touchStart || !touch || hasMovedRef.current) {
				lastTapRef.current = null;
				return;
			}

			const touchEnd = getTouchPoint(touch);
			if (getDistance(touchStart, touchEnd) > TAP_MOVE_TOLERANCE_PX) {
				lastTapRef.current = null;
				return;
			}

			const now = Date.now();
			const lastTap = lastTapRef.current;
			const hasDoubleTapped =
				lastTap &&
				now - lastTap.at < DOUBLE_TAP_DELAY_MS &&
				getDistance(lastTap.point, touchEnd) <= TAP_MOVE_TOLERANCE_PX;

			if (!hasDoubleTapped) {
				lastTapRef.current = { at: now, point: touchEnd };
				return;
			}

			lastTapRef.current = null;
			callback(event);
		},
		[callback],
	);

	return useMemo(
		() => ({
			onTouchStart: handleTouchStart,
			onTouchMove: handleTouchMove,
			onTouchEnd: handleTouchEnd,
		}),
		[handleTouchStart, handleTouchMove, handleTouchEnd],
	);
}

function getTouchPoint(touch: Touch) {
	//
	return {
		x: touch.clientX,
		y: touch.clientY,
	};
}

function getDistance(pointA: TouchPoint, pointB: TouchPoint) {
	//
	return Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y);
}
