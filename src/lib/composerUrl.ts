import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

// the shape of what we persist (short keys to minimize URL size)
export type ComposerURLState = {
	q: Array<{ k: string; a: Record<string, unknown> }>; // queue (skillKey, args)
	m: string; // message
	cs?: string[]; // collapsed strips
};

export function encodeComposerState(state: ComposerURLState): string {
	//
	const json = JSON.stringify(state);
	return compressToEncodedURIComponent(json);
}

export function decodeComposerState(encoded: string): ComposerURLState | null {
	//
	try {
		const json = decompressFromEncodedURIComponent(encoded);
		if (!json) return null;
		return JSON.parse(json) as ComposerURLState;
	} catch {
		return null;
	}
}

// helper to create empty state
export function createEmptyComposerURLState(): ComposerURLState {
	//
	return {
		q: [],
		m: '',
	};
}

// helper to check if state is empty
export function isComposerURLStateEmpty(state: ComposerURLState): boolean {
	//
	return state.q.length === 0 && !state.m.trim();
}
