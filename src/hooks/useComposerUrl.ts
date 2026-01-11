import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo, useRef } from 'react';
import {
	type ComposerURLState,
	createEmptyComposerURLState,
	decodeComposerState,
	encodeComposerState,
	isComposerURLStateEmpty,
} from '~/lib/composerUrl';

type UpdateOptions = {
	replace?: boolean;
};

export function useComposerUrl() {
	//
	const search = useSearch({ strict: false }) as { c?: string };
	const navigate = useNavigate();

	// track if this is the first non-empty state (for history management)
	const wasEmptyRef = useRef(true);

	const state = useMemo(() => {
		//
		if (!search.c) return createEmptyComposerURLState();

		const decoded = decodeComposerState(search.c);
		return decoded ?? createEmptyComposerURLState();
	}, [search.c]);

	// update wasEmptyRef when state changes
	const isEmpty = isComposerURLStateEmpty(state);
	if (isEmpty) {
		wasEmptyRef.current = true;
	}

	const updateState = useCallback(
		(newState: Partial<ComposerURLState>, options?: UpdateOptions) => {
			//
			const merged: ComposerURLState = {
				q: newState.q ?? state.q,
				m: newState.m ?? state.m,
				cs: newState.cs ?? state.cs,
			};

			const isNowEmpty = isComposerURLStateEmpty(merged);

			// determine if we should push or replace
			// push when: going from empty to non-empty (first interaction)
			// replace for everything else (don't spam history)
			const wasEmpty = wasEmptyRef.current;
			const shouldPush = wasEmpty && !isNowEmpty;

			if (!isNowEmpty) {
				wasEmptyRef.current = false;
			}

			const shouldReplace = options?.replace ?? !shouldPush;

			navigate({
				to: '.',
				search: (prev) => ({
					...prev,
					c: isNowEmpty ? undefined : encodeComposerState(merged),
				}),
				replace: shouldReplace,
			});
		},
		[state, navigate],
	);

	// clear state with history push (restore point)
	const clearState = useCallback(() => {
		//
		wasEmptyRef.current = true;

		navigate({
			to: '.',
			search: (prev) => ({
				...prev,
				c: undefined,
			}),
			replace: false, // push to create restore point
		});
	}, [navigate]);

	return {
		state,
		updateState,
		clearState,
		isEmpty,
	};
}
