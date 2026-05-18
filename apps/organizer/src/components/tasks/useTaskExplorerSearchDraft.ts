import { useEffect, useRef, useState } from 'react';
import type { ExplorerQueryInput, ExplorerRouteSearch } from '~/lib/explorerSearchParams';
import { SEARCH_DEBOUNCE_MS } from './taskExplorerUtils';

interface TaskExplorerSearchDraftInput {
	queryInput: ExplorerQueryInput;
	updateSearch: (partial: Partial<ExplorerRouteSearch>, options?: { replace?: boolean }) => void;
}

export function useTaskExplorerSearchDraft({ queryInput, updateSearch }: TaskExplorerSearchDraftInput) {
	//
	const [searchDraft, setSearchDraft] = useState(queryInput.q);
	const lastCommittedSearchRef = useRef(queryInput.q);

	useEffect(() => {
		if (queryInput.q === lastCommittedSearchRef.current) return;
		setSearchDraft(queryInput.q);
		lastCommittedSearchRef.current = queryInput.q;
	}, [queryInput.q]);

	useEffect(() => {
		const debounceHandle = setTimeout(() => {
			if (searchDraft === queryInput.q) return;
			lastCommittedSearchRef.current = searchDraft;
			updateSearch(
				{
					q: searchDraft.length > 0 ? searchDraft : undefined,
				},
				{ replace: true },
			);
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			clearTimeout(debounceHandle);
		};
	}, [searchDraft, queryInput.q, updateSearch]);

	return {
		searchDraft,
		setSearchDraft,
	};
}
