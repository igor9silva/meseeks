import { describe, expect, test } from 'bun:test';
import { formatDistanceToNow } from './date';

const now = new Date('2026-05-07T12:00:00.000Z');

describe('formatDistanceToNow', () => {
	test('formats sub-minute distances', () => {
		expect(formatDistanceToNow(new Date(now.getTime() - 20_000), { now })).toBe('less than a minute');
	});

	test('formats minute distances', () => {
		expect(formatDistanceToNow(new Date(now.getTime() - 60_000), { now })).toBe('1 minute');
		expect(formatDistanceToNow(new Date(now.getTime() - 5 * 60_000), { now })).toBe('5 minutes');
	});

	test('formats hour distances', () => {
		expect(formatDistanceToNow(new Date(now.getTime() - HOUR_MS), { now })).toBe('about 1 hour');
		expect(formatDistanceToNow(new Date(now.getTime() - 5 * HOUR_MS), { now })).toBe('about 5 hours');
	});

	test('formats day, month, and year distances', () => {
		expect(formatDistanceToNow(new Date(now.getTime() - DAY_MS), { now })).toBe('1 day');
		expect(formatDistanceToNow(new Date(now.getTime() - 10 * DAY_MS), { now })).toBe('10 days');
		expect(formatDistanceToNow(new Date(now.getTime() - 40 * DAY_MS), { now })).toBe('about 1 month');
		expect(formatDistanceToNow(new Date(now.getTime() - 120 * DAY_MS), { now })).toBe('4 months');
		expect(formatDistanceToNow(new Date(now.getTime() - 400 * DAY_MS), { now })).toBe('about 1 year');
		expect(formatDistanceToNow(new Date(now.getTime() - 800 * DAY_MS), { now })).toBe('2 years');
	});

	test('adds past and future suffixes', () => {
		expect(formatDistanceToNow(new Date(now.getTime() - 2 * MINUTE_MS), { now, addSuffix: true })).toBe(
			'2 minutes ago',
		);
		expect(formatDistanceToNow(new Date(now.getTime() + 2 * MINUTE_MS), { now, addSuffix: true })).toBe(
			'in 2 minutes',
		);
	});
});

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
