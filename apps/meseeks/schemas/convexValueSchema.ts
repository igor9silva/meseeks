import type { Value } from 'convex/values';
import { z } from 'zod';

// zod 4 preserves record value types in the convex data model, so arbitrary values must be convex values.
export const convexValueSchema = z.unknown().refine(isConvexValue, 'Invalid Convex value');

function isConvexValue(value: unknown): value is Value {
	//
	if (value === null) return true;
	if (
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		typeof value === 'bigint'
	) {
		return true;
	}
	if (value instanceof ArrayBuffer) return true;
	if (Array.isArray(value)) return value.every(isConvexValue);
	if (typeof value !== 'object') return false;

	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) return false;
	return Object.values(value).every((item) => item === undefined || isConvexValue(item));
}
