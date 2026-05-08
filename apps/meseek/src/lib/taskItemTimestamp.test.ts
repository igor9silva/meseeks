/// <reference types="bun" />

import { describe, expect, test } from 'bun:test';
import { formatTaskItemTimestamp, formatTaskItemTimestampTooltip } from './taskItemTimestamp';

const NOW = new Date('2026-04-27T13:48:00.000Z');

describe('formatTaskItemTimestamp', () => {
	//
	test('formats sub-minute timestamps as now', () => {
		//
		expect(formatTaskItemTimestamp(at({ seconds: 0 }), { now: NOW })).toBe('now');
		expect(formatTaskItemTimestamp(at({ seconds: 30 }), { now: NOW })).toBe('now');
		expect(formatTaskItemTimestamp(NOW.getTime() + 30_000, { now: NOW })).toBe('now');
	});

	test('formats recent timestamps as compact minutes up to the first hour', () => {
		//
		expect(formatTaskItemTimestamp(at({ minutes: 1 }), { now: NOW })).toBe('1min ago');
		expect(formatTaskItemTimestamp(at({ minutes: 3 }), { now: NOW })).toBe('3min ago');
		expect(formatTaskItemTimestamp(at({ minutes: 59, seconds: 59 }), { now: NOW })).toBe('59min ago');
	});

	test('formats recent timestamps as compact hours up to six hours', () => {
		//
		expect(formatTaskItemTimestamp(at({ hours: 1 }), { now: NOW })).toBe('1h ago');
		expect(formatTaskItemTimestamp(at({ hours: 2, minutes: 59 }), { now: NOW })).toBe('2h ago');
		expect(formatTaskItemTimestamp(at({ hours: 5, minutes: 59 }), { now: NOW })).toBe('5h ago');
		expect(formatTaskItemTimestamp(at({ hours: 6 }), { now: NOW })).toBe('6h ago');
	});

	test('uses the system time format after six hours and before twenty four hours', () => {
		//
		expect(formatTaskItemTimestamp(at({ hours: 6, seconds: 1 }), { now: NOW, locale: 'en-GB' })).toBe('07:47');
		expect(formatTaskItemTimestamp(at({ hours: 11, minutes: 43 }), { now: NOW, locale: 'en-GB' })).toBe('02:05');
		expect(formatTaskItemTimestamp(at({ hours: 23, minutes: 59 }), { now: NOW, locale: 'en-GB' })).toBe('13:49');
	});

	test('respects twelve hour system time settings', () => {
		//
		expect(formatTaskItemTimestamp(at({ hours: 6, seconds: 1 }), { now: NOW, locale: 'en-US' })).toBe('7:47 AM');
		expect(formatTaskItemTimestamp(at({ hours: 11, minutes: 43 }), { now: NOW, locale: 'en-US' })).toBe('2:05 AM');
		expect(formatTaskItemTimestamp(date('2026-04-25T20:04:00.000Z'), { now: NOW, locale: 'en-US' })).toBe(
			'2d ago, 8:04 PM',
		);
	});

	test('formats yesterday after the twenty four hour mark', () => {
		//
		expect(formatTaskItemTimestamp(at({ days: 1 }), { now: NOW, locale: 'en-GB' })).toBe('Yesterday, 13:48');
		expect(formatTaskItemTimestamp(at({ days: 1, minutes: 1 }), { now: NOW, locale: 'en-GB' })).toBe(
			'Yesterday, 13:47',
		);
		expect(formatTaskItemTimestamp(date('2026-04-26T00:05:00.000Z'), { now: NOW, locale: 'en-GB' })).toBe(
			'Yesterday, 00:05',
		);
	});

	test('formats two through thirty days with time', () => {
		//
		expect(formatTaskItemTimestamp(at({ days: 2 }), { now: NOW, locale: 'en-GB' })).toBe('2d ago, 13:48');
		expect(formatTaskItemTimestamp(at({ days: 13, hours: 2 }), { now: NOW, locale: 'en-GB' })).toBe(
			'13d ago, 11:48',
		);
		expect(formatTaskItemTimestamp(at({ days: 30, hours: 1 }), { now: NOW, locale: 'en-GB' })).toBe(
			'30d ago, 12:48',
		);
	});

	test('formats more than thirty days through three months as weeks', () => {
		//
		expect(formatTaskItemTimestamp(at({ days: 31 }), { now: NOW })).toBe('4w+ ago');
		expect(formatTaskItemTimestamp(at({ days: 35 }), { now: NOW })).toBe('5w ago');
		expect(formatTaskItemTimestamp(at({ days: 41 }), { now: NOW })).toBe('5w+ ago');
		expect(formatTaskItemTimestamp(at({ days: 60 }), { now: NOW })).toBe('8w+ ago');
		expect(formatTaskItemTimestamp(at({ days: 89 }), { now: NOW })).toBe('12w+ ago');
	});

	test('formats three months through three years as months', () => {
		//
		expect(formatTaskItemTimestamp(date('2026-01-27T13:48:00.000Z'), { now: NOW })).toBe('3mo ago');
		expect(formatTaskItemTimestamp(date('2026-01-26T13:48:00.000Z'), { now: NOW })).toBe('3mo+ ago');
		expect(formatTaskItemTimestamp(date('2025-10-27T13:48:00.000Z'), { now: NOW })).toBe('6mo ago');
		expect(formatTaskItemTimestamp(date('2024-05-28T13:48:00.000Z'), { now: NOW })).toBe('22mo+ ago');
		expect(formatTaskItemTimestamp(date('2023-05-27T13:48:00.000Z'), { now: NOW })).toBe('35mo ago');
		expect(formatTaskItemTimestamp(date('2023-05-26T13:48:00.000Z'), { now: NOW })).toBe('35mo+ ago');
	});

	test('formats three years and older as years', () => {
		//
		expect(formatTaskItemTimestamp(date('2023-04-27T13:48:00.000Z'), { now: NOW })).toBe('3y ago');
		expect(formatTaskItemTimestamp(date('2023-04-26T13:48:00.000Z'), { now: NOW })).toBe('3y+ ago');
		expect(formatTaskItemTimestamp(date('2022-04-27T13:48:00.000Z'), { now: NOW })).toBe('4y ago');
		expect(formatTaskItemTimestamp(date('2021-04-28T13:48:00.000Z'), { now: NOW })).toBe('4y+ ago');
		expect(formatTaskItemTimestamp(date('2021-04-27T13:48:00.000Z'), { now: NOW })).toBe('5y ago');
		expect(formatTaskItemTimestamp(date('2019-01-01T00:00:00.000Z'), { now: NOW })).toBe('7y+ ago');
	});

	test('returns an ISO tooltip value', () => {
		//
		expect(formatTaskItemTimestampTooltip(date('2026-04-25T20:04:00.000Z'))).toBe('2026-04-25T20:04:00.000Z');
	});
});

function at({
	days = 0,
	hours = 0,
	minutes = 0,
	seconds = 0,
}: {
	days?: number;
	hours?: number;
	minutes?: number;
	seconds?: number;
}) {
	//
	return new Date(
		NOW.getTime() - days * 24 * 60 * 60 * 1000 - hours * 60 * 60 * 1000 - minutes * 60 * 1000 - seconds * 1000,
	);
}

function date(value: string) {
	//
	return new Date(value);
}
