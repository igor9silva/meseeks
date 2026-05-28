export function useSubmitHotkey() {
	//
	return (e: React.KeyboardEvent<HTMLFormElement>) => {
		//
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			e.currentTarget.requestSubmit();
		}
	};
}
