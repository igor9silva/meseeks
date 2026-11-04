import { z } from 'zod';
import { dezerialize, zerialize, type ZodTypes } from 'zodex';

const serializedShapeSchema = z.discriminatedUnion('type', [
	z.looseObject({ type: z.literal('string') }),
	z.looseObject({ type: z.literal('number') }),
	z.looseObject({ type: z.literal('boolean') }),
	z.looseObject({ type: z.literal('nan') }),
	z.looseObject({ type: z.literal('bigInt') }),
	z.looseObject({ type: z.literal('date') }),
	z.looseObject({ type: z.literal('undefined') }),
	z.looseObject({ type: z.literal('null') }),
	z.looseObject({ type: z.literal('any') }),
	z.looseObject({ type: z.literal('unknown') }),
	z.looseObject({ type: z.literal('never') }),
	z.looseObject({ type: z.literal('void') }),
	z.looseObject({ type: z.literal('symbol') }),
	z.looseObject({
		type: z.literal('literal'),
		values: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
	}),
	z.looseObject({ type: z.literal('object'), properties: z.record(z.string(), z.unknown()) }),
	z.looseObject({ type: z.literal('array'), element: z.unknown() }),
	z.looseObject({ type: z.literal('set'), value: z.unknown() }),
	z.looseObject({ type: z.literal('promise'), value: z.unknown() }),
	z.looseObject({ type: z.literal('record'), key: z.unknown(), value: z.unknown() }),
	z.looseObject({ type: z.literal('map'), key: z.unknown(), value: z.unknown() }),
	z.looseObject({
		type: z.literal('enum'),
		values: z.union([z.array(z.string()), z.record(z.string(), z.union([z.string(), z.number()]))]),
	}),
	z.looseObject({ type: z.literal('union'), options: z.array(z.unknown()) }),
	z.looseObject({ type: z.literal('discriminatedUnion'), discriminator: z.string(), options: z.array(z.unknown()) }),
	z.looseObject({ type: z.literal('intersection'), left: z.unknown(), right: z.unknown() }),
	z.looseObject({ type: z.literal('tuple'), items: z.array(z.unknown()) }),
	z.looseObject({ type: z.literal('catch'), innerType: z.unknown(), value: z.unknown() }),
	z.looseObject({ type: z.literal('pipe'), inner: z.unknown(), outer: z.unknown() }),
	z.looseObject({ type: z.literal('transform'), name: z.string() }),
]);

export function zodToString(schema: ZodTypes) {
	return JSON.stringify(zerialize(schema));
}

export function stringToZod(schema: string): z.ZodType {
	return dezerialize(serializedShapeSchema.parse(normalizeShape(JSON.parse(schema))));
}

function normalizeShape(input: unknown): Record<string, unknown> {
	//
	// stored skill schemas and skill prompts still use zodex 3's wire format.
	const shape = z.record(z.string(), z.unknown()).parse(input);
	if ('$ref' in shape) return shape;

	const normalized = { ...shape };
	if (shape.type === 'literal' && 'value' in shape) {
		normalized.values = [shape.value];
		delete normalized.value;
	}
	if (shape.type === 'number' && shape.int === true) normalized.format = 'safeint';
	if (shape.type === 'nativeEnum') normalized.type = 'enum';

	if (shape.type === 'object') {
		const properties = z.record(z.string(), z.unknown()).parse(shape.properties);
		normalized.properties = Object.fromEntries(
			Object.entries(properties).map(([key, value]) => [key, normalizeShape(value)]),
		);
		if (!shape.catchall && shape.unknownKeys === 'strict') normalized.catchall = { type: 'never' };
		if (!shape.catchall && shape.unknownKeys === 'passthrough') normalized.catchall = { type: 'unknown' };
	}

	for (const key of ['element', 'key', 'innerType', 'inner', 'outer', 'left', 'right', 'rest', 'catchall']) {
		if (key in shape) normalized[key] = normalizeShape(shape[key]);
	}
	if (['record', 'map', 'set', 'promise'].includes(String(shape.type)))
		normalized.value = normalizeShape(shape.value);
	for (const key of ['options', 'items']) {
		if (key in shape) normalized[key] = z.array(z.unknown()).parse(shape[key]).map(normalizeShape);
	}

	if (shape.type === 'effect') {
		// the old loader ignored named effects when no implementations were supplied.
		delete normalized.type;
		delete normalized.inner;
		delete normalized.effects;
		return { ...normalizeShape(shape.inner), ...normalized };
	}
	return normalized;
}
