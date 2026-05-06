import { useCallback } from 'react';

export function useSubmitHotkey() {
	//
	return useCallback((e: React.KeyboardEvent<HTMLFormElement>) => {
		//
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			e.currentTarget.requestSubmit();
		}
	}, []);
}
