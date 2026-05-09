export type VoiceTextAnchor = {
	value: string;
	selectionStart: number;
	selectionEnd: number;
};

export function getVoiceTextAnchor(textarea: HTMLTextAreaElement | null, value: string): VoiceTextAnchor {
	//
	return {
		value,
		selectionStart: textarea?.selectionStart ?? value.length,
		selectionEnd: textarea?.selectionEnd ?? value.length,
	};
}

export function insertVoiceText(anchor: VoiceTextAnchor, transcript: string) {
	//
	const text = transcript.trim();
	if (!text) return anchor.value;

	const before = anchor.value.slice(0, anchor.selectionStart);
	const after = anchor.value.slice(anchor.selectionEnd);
	const beforeGap = before && !/\s$/.test(before) ? ' ' : '';
	const afterGap = after && !/^\s/.test(after) ? ' ' : '';

	return `${before}${beforeGap}${text}${afterGap}${after}`;
}
