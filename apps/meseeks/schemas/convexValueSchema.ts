import { convexToJson, getConvexSize, type Value } from 'convex/values';
import { z } from 'zod';

const maxValueSize = 1024 * 1024;

// zod 4 preserves record value types in the convex data model, so arbitrary values must be convex values.
export const convexValueSchema = z.unknown().refine(isConvexValue, 'Invalid Convex value');
export const convexObjectSchema = z
	.record(
		z
			.string()
			.min(1)
			.refine((key) => !key.startsWith('_'), 'Reserved Convex record key'),
		convexValueSchema,
	)
	.refine(isConvexValue, 'Invalid Convex object');

function isConvexValue(value: unknown): value is Value {
	//
	const ancestors = new WeakSet<object>();
	let remainingNodes = maxValueSize;

	function visit(input: unknown, depth: number): input is Value {
		// bound traversal before calling the sdk, whose serializer does not detect cycles.
		if (--remainingNodes < 0 || depth > 16) return false;
		if (input === null) return true;
		if (typeof input === 'string') return input.length < maxValueSize && !/[\uD800-\uDFFF]/u.test(input);
		if (typeof input === 'number' || typeof input === 'boolean' || typeof input === 'bigint') return true;
		if (input instanceof ArrayBuffer) return input.byteLength < maxValueSize;
		if (typeof input !== 'object' || ancestors.has(input)) return false;

		ancestors.add(input);
		try {
			if (Array.isArray(input)) {
				if (input.length > 8192) return false;
				// iteration also visits holes, which are not valid convex array elements.
				for (const item of input) if (!visit(item, depth + 1)) return false;
				return true;
			}
			const prototype = Object.getPrototypeOf(input);
			if (prototype !== Object.prototype && prototype !== null) return false;
			let fields = 0;
			for (const item of Object.values(input)) {
				if (item === undefined) continue;
				if (++fields > 1024 || !visit(item, depth + 1)) return false;
			}
			return true;
		} finally {
			ancestors.delete(input);
		}
	}

	try {
		if (!visit(value, 0) || getConvexSize(value) > maxValueSize) return false;
		// the installed sdk owns int64 bounds, field encoding and special number serialization.
		convexToJson(value);
		return true;
	} catch {
		return false;
	}
}
