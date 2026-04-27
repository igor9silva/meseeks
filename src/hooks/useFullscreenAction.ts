import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, TouchEvent } from 'react';
import { useDoubleTap } from '~/hooks/useDoubleTap';

type FullscreenActionEvent = MouseEvent | TouchEvent;

export function useFullscreenAction() {
	//
	const containerRef = useRef<HTMLDivElement>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [placeholderHeight, setPlaceholderHeight] = useState<number | undefined>();

	const measurePlaceholder = useCallback(() => {
		//
		const element = containerRef.current;
		if (!element) return;

		setPlaceholderHeight(element.getBoundingClientRect().height);
	}, []);

	const open = useCallback(
		(event?: FullscreenActionEvent) => {
			//
			event?.preventDefault();
			event?.stopPropagation();
			measurePlaceholder();
			setIsFullscreen(true);
		},
		[measurePlaceholder],
	);

	const close = useCallback((event?: FullscreenActionEvent) => {
		//
		event?.preventDefault();
		event?.stopPropagation();
		setIsFullscreen(false);
	}, []);

	const toggle = useCallback(
		(event?: FullscreenActionEvent) => {
			//
			event?.preventDefault();
			event?.stopPropagation();

			if (isFullscreen) {
				setIsFullscreen(false);
				return;
			}

			measurePlaceholder();
			setIsFullscreen(true);
		},
		[isFullscreen, measurePlaceholder],
	);

	const handleOpenDoubleTap = useDoubleTap(open);
	const handleCloseDoubleTap = useDoubleTap(close);

	useEffect(() => {
		//
		if (!isFullscreen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			//
			if (event.key !== 'Escape') return;

			event.preventDefault();
			setIsFullscreen(false);
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [isFullscreen]);

	const placeholderStyle: CSSProperties | undefined =
		isFullscreen && placeholderHeight !== undefined ? { height: placeholderHeight } : undefined;

	return {
		containerRef,
		handleCloseDoubleTap,
		handleOpenDoubleTap,
		isFullscreen,
		open,
		close,
		placeholderStyle,
		toggle,
	};
}
