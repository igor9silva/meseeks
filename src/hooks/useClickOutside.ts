import { RefObject, useEffect } from 'react';

export function useClickOutside(
	ref: RefObject<HTMLElement>, //
	callback: () => void,
	shouldListen = true,
) {
	// if click on document does NOT contain the ref (clicked outside), then close
	useEffect(() => {
		//
		if (!shouldListen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				callback();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [ref, callback, shouldListen]);
}
