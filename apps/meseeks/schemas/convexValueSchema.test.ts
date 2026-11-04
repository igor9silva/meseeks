import { expect, test } from 'bun:test';
import { convexValueSchema } from './convexValueSchema';

test('accepts supported convex values, including nested bigints and bytes', () => {
	const value = { amount: 1n, details: [null, true, 'text', 42, new ArrayBuffer(2)], optional: undefined };
	expect(convexValueSchema.parse(value)).toBe(value);
});

test('rejects values that cannot be stored in convex', () => {
	for (const value of [undefined, () => true, new Date(), { nested: { callback: () => true } }]) {
		expect(convexValueSchema.safeParse(value).success).toBe(false);
	}
});
