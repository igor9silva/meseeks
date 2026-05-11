import { describe, expect, test } from 'bun:test';
import { applyVoiceText, parseDictionaryTerms, type VoiceTextAnchor } from './voiceText';

describe('applyVoiceText', () => {
	test('inserts voice text at the current selection', () => {
		const anchor: VoiceTextAnchor = {
			value: 'Before after',
			selectionStart: 7,
			selectionEnd: 7,
			mode: 'insert',
		};

		expect(applyVoiceText(anchor, 'spoken')).toBe('Before spoken after');
	});

	test('replaces selected text', () => {
		const anchor: VoiceTextAnchor = {
			value: 'Before old after',
			selectionStart: 7,
			selectionEnd: 10,
			mode: 'replace',
		};

		expect(applyVoiceText(anchor, 'new')).toBe('Before new after');
	});

	test('revises the same anchor as realtime deltas change', () => {
		const anchor: VoiceTextAnchor = {
			value: 'Existing prompt',
			selectionStart: 15,
			selectionEnd: 15,
			mode: 'insert',
		};

		expect(applyVoiceText(anchor, 'first pass')).toBe('Existing prompt first pass');
		expect(applyVoiceText(anchor, 'first pass revised')).toBe('Existing prompt first pass revised');
	});

	test('appends voice text as a new block', () => {
		const anchor: VoiceTextAnchor = {
			value: 'Existing prompt',
			selectionStart: 15,
			selectionEnd: 15,
			mode: 'append',
		};

		expect(applyVoiceText(anchor, 'new words')).toBe('Existing prompt\n\nnew words');
	});
});

describe('parseDictionaryTerms', () => {
	test('parses comma and newline separated terms', () => {
		expect(parseDictionaryTerms('Convex, TanStack\nRealtime\nConvex')).toEqual(['Convex', 'TanStack', 'Realtime']);
	});
});
