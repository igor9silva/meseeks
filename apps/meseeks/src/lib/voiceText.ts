export type VoiceTextMode = 'insert' | 'replace' | 'append';

export type VoiceTextAnchor = {
	value: string;
	selectionStart: number;
	selectionEnd: number;
	mode: VoiceTextMode;
};

export function getVoiceTextAnchor(
	textarea: HTMLTextAreaElement | null,
	value: string,
	mode: VoiceTextMode = 'insert',
): VoiceTextAnchor {
	if (mode === 'append') {
		return {
			value,
			selectionStart: value.length,
			selectionEnd: value.length,
			mode,
		};
	}

	return {
		value,
		selectionStart: textarea?.selectionStart ?? value.length,
		selectionEnd:
			mode === 'replace' ? (textarea?.selectionEnd ?? value.length) : (textarea?.selectionStart ?? value.length),
		mode,
	};
}

export function applyVoiceText(anchor: VoiceTextAnchor, transcript: string) {
	const text = transcript.trim();
	if (!text) return anchor.value;

	if (anchor.mode === 'append') {
		return appendVoiceText(anchor.value, text);
	}

	const before = anchor.value.slice(0, anchor.selectionStart);
	const after = anchor.value.slice(anchor.selectionEnd);

	const beforeGap = before && !/\s$/.test(before) ? ' ' : '';
	const afterGap = after && !/^\s/.test(after) ? ' ' : '';

	return `${before}${beforeGap}${text}${afterGap}${after}`;
}

export function parseDictionaryTerms(value: string) {
	return dedupe(
		value
			.split(/[\n,]/)
			.map((term) => term.trim())
			.filter((term) => term.length > 0),
	).slice(0, 60);
}

function appendVoiceText(value: string, text: string) {
	const trimmed = value.trimEnd();
	if (!trimmed) return text;
	return `${trimmed}\n\n${text}`;
}

function dedupe(values: string[]) {
	return Array.from(new Set(values));
}
