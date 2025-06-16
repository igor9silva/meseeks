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
	const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

	useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};
		mql.addEventListener('change', onChange);
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		return () => mql.removeEventListener('change', onChange);
	}, []);

	return Boolean(isMobile);
}
