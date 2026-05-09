export type VoiceInsertMode = 'insert' | 'replace' | 'append';

export type VoiceTextAnchor = {
	value: string;
	selectionStart: number;
	selectionEnd: number;
	mode: VoiceInsertMode;
};

export function getVoiceTextAnchor(
	textarea: HTMLTextAreaElement | null,
	value: string,
	mode: VoiceInsertMode,
): VoiceTextAnchor {
	const selectionStart = textarea?.selectionStart ?? value.length;
	const selectionEnd = textarea?.selectionEnd ?? value.length;

	if (mode === 'append') {
		return {
			value,
			selectionStart: value.length,
			selectionEnd: value.length,
			mode,
		};
	}

	if (mode === 'replace' && selectionStart === selectionEnd) {
		return {
			value,
			selectionStart: 0,
			selectionEnd: value.length,
			mode,
		};
	}

	return {
		value,
		selectionStart,
		selectionEnd,
		mode,
	};
}

export function insertVoiceText(anchor: VoiceTextAnchor, transcript: string) {
	const text = transcript.trim();
	if (!text) return anchor.value;

	const before = anchor.value.slice(0, anchor.selectionStart);
	const after = anchor.value.slice(anchor.selectionEnd);

	if (anchor.mode === 'append') {
		const blockGap = before.trim().length > 0 && !before.endsWith('\n') ? '\n' : '';
		return `${before}${blockGap}${text}`;
	}

	const beforeGap = before && !/\s$/.test(before) ? ' ' : '';
	const afterGap = after && !/^\s/.test(after) ? ' ' : '';

	return `${before}${beforeGap}${text}${afterGap}${after}`;
}

export function parseDictionaryTerms(value: string) {
	return value
		.split(/[\n,]/)
		.map((term) => term.trim())
		.filter(Boolean);
}
