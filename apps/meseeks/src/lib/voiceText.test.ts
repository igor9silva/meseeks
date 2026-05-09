// @ts-nocheck

import { describe, expect, test } from 'bun:test';
import { insertVoiceText } from './voiceText';

describe('insertVoiceText', () => {
	//
	test('appends voice text with a separating space', () => {
		//
		expect(insertVoiceText({ value: 'Existing prompt', selectionStart: 15, selectionEnd: 15 }, 'new words')).toBe(
			'Existing prompt new words',
		);
	});

	test('inserts voice text at the current selection', () => {
		//
		expect(insertVoiceText({ value: 'Before after', selectionStart: 7, selectionEnd: 7 }, 'spoken')).toBe(
			'Before spoken after',
		);
	});

	test('replaces selected text', () => {
		//
		expect(insertVoiceText({ value: 'Before old after', selectionStart: 7, selectionEnd: 10 }, 'new')).toBe(
			'Before new after',
		);
	});

	test('replaces the same anchor as realtime deltas revise', () => {
		//
		const anchor = { value: 'Existing prompt', selectionStart: 15, selectionEnd: 15 };

		expect(insertVoiceText(anchor, 'first pass')).toBe('Existing prompt first pass');
		expect(insertVoiceText(anchor, 'first pass revised')).toBe('Existing prompt first pass revised');
	});
});
