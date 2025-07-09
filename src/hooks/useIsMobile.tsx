import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * A React hook that detects if the current viewport is mobile-sized.
 *
 * Returns a boolean indicating if the viewport width is less than 768px.
 * The value updates automatically when the window is resized.
 *
 * @returns {boolean} True if viewport is mobile-sized (<{MOBILE_BREAKPOINT}px), false otherwise
 *
 * @example
 * function MyComponent() {
 *   const isMobile = useIsMobile();
 *   return isMobile ? <MobileView /> : <DesktopView />;
 * }
 */
export function useIsMobile() {
	//
	const { isMobile } = useIsMobileWithMounted();

	return isMobile;
}

/**
 * Hook that returns both mobile state and mounted state
 */
export function useIsMobileWithMounted() {
	//
	const [isMobile, setIsMobile] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);

		const checkMobile = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};

		// initial check
		checkMobile();

		// listen for changes
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		mql.addEventListener('change', checkMobile);

		return () => mql.removeEventListener('change', checkMobile);
	}, []);

	return { isMobile: isMounted ? isMobile : false, isMounted };
}
