import { expect, test } from 'bun:test';
import { convexObjectSchema, convexValueSchema } from './convexValueSchema';

test('accepts supported convex values, including nested bigints and bytes', () => {
	const value = { amount: 1n, details: [null, true, 'text', 42, new ArrayBuffer(2)], optional: undefined };
	expect(convexValueSchema.parse(value)).toBe(value);
});

test('rejects values that cannot be stored in convex', () => {
	for (const value of [undefined, () => true, new Date(), { nested: { callback: () => true } }]) {
		expect(convexValueSchema.safeParse(value).success).toBe(false);
	}
});

test('preserves int64 boundaries and special floats while rejecting out-of-range bigints', () => {
	for (const value of [-(2n ** 63n), 2n ** 63n - 1n, NaN, Infinity, -Infinity, -0]) {
		expect(convexValueSchema.parse(value)).toBe(value);
	}
	for (const amount of [-(2n ** 63n) - 1n, 2n ** 63n]) {
		expect(convexValueSchema.safeParse({ nested: [{ amount }] }).success).toBe(false);
	}
});

test('rejects invalid field encodings at the root and inside nested values', () => {
	for (const key of ['$reserved', 'line\nbreak', 'ação', 'x'.repeat(1025)]) {
		expect(convexObjectSchema.safeParse({ [key]: 1 }).success).toBe(false);
		expect(convexValueSchema.safeParse({ nested: { [key]: 1 } }).success).toBe(false);
	}
	for (const key of ['', '_reserved']) {
		expect(convexObjectSchema.safeParse({ [key]: 1 }).success).toBe(false);
	}
	expect(convexObjectSchema.parse({ 'amount': 1n, 'has space': true })).toEqual({ 'amount': 1n, 'has space': true });
});

test('rejects cycles and sparse arrays without rejecting repeated references', () => {
	const object: Record<string, unknown> = {};
	object.self = object;
	const array: unknown[] = [];
	array.push(array);
	for (const value of [object, array, new Array(2)]) {
		expect(convexValueSchema.safeParse(value).success).toBe(false);
	}
	const shared = { amount: 42n };
	const value = { left: shared, right: shared };
	expect(convexValueSchema.parse(value)).toBe(value);
});

test('bounds collection sizes and nested depth before sdk serialization', () => {
	expect(convexValueSchema.safeParse(Array(8192).fill(null)).success).toBe(true);
	expect(convexValueSchema.safeParse(Array(8193).fill(null)).success).toBe(false);
	const fields = Array.from({ length: 1024 }, (_, index) => [`key${index}`, null]);
	expect(convexValueSchema.safeParse(Object.fromEntries(fields)).success).toBe(true);
	expect(convexObjectSchema.safeParse(Object.fromEntries(fields.concat([['extra', null]]))).success).toBe(false);
	let nested: unknown = null;
	for (let depth = 0; depth < 16; depth++) nested = { nested };
	expect(convexValueSchema.safeParse(nested).success).toBe(true);
	expect(convexValueSchema.safeParse({ nested }).success).toBe(false);
});

test('checks aggregate encoded size and preserves valid unicode', () => {
	expect(convexValueSchema.parse('ação 🦉')).toBe('ação 🦉');
	for (const value of ['\uD800', '\uDC00', '🦉'.repeat(300_000), new ArrayBuffer(1024 * 1024)]) {
		expect(convexValueSchema.safeParse(value).success).toBe(false);
	}
	expect(convexObjectSchema.safeParse({ first: 'x'.repeat(600_000), second: 'x'.repeat(600_000) }).success).toBe(
		false,
	);
});
