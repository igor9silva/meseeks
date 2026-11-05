import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { normalizeSkillSchema, readSkillSchema, stringToZod, zodToString } from './persistedSkillSchema';

describe('stored skill schemas', () => {
	test('rejects old, ambiguous or unsupported documents instead of weakening validation', () => {
		for (const document of [
			'not json',
			'{}',
			'{"type":"object","properties":{"value":{"type":"string"}}}',
			'{"x-meseeks-schema-version":2,"type":"string"}',
			'{"x-meseeks-schema-version":1,"type":"string","x-codec":"unknown"}',
			'{"x-meseeks-schema-version":1,"$ref":"https://example.invalid/schema.json"}',
			'{"x-meseeks-schema-version":1,"type":"string","trim":true}',
		]) {
			expect(() => stringToZod(document)).toThrow();
			expect(() => normalizeSkillSchema(document)).toThrow();
		}
	});

	test('bounds size and nesting before recursive schema parsing', () => {
		expect(() => stringToZod(' '.repeat(1_000_001))).toThrow('exceeds 1 MB');
		let nested: z.JSONType = { type: 'string' };
		for (let depth = 0; depth < 65; depth++) nested = { type: 'array', items: nested };
		expect(() => stringToZod(JSON.stringify({ 'x-meseeks-schema-version': 1, 'allOf': [nested] }))).toThrow(
			'too complex',
		);
	});

	test('normalizes declared JSON Schema idempotently', () => {
		const document = JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'string' });
		const normalized = normalizeSkillSchema(document);
		expect(normalizeSkillSchema(normalized)).toBe(normalized);
		expect(readSkillSchema(normalized)['x-meseeks-schema-version']).toBe(1);
	});

	test('preserves migrated optional-before-prefault ordering and validates prefaults', () => {
		const schema = stringToZod(
			JSON.stringify({
				'x-meseeks-schema-version': 1,
				'type': 'object',
				'properties': {
					value: { 'type': 'string', 'default': 'hello', 'x-zod-prefault': true, 'x-zod-optional': true },
				},
			}),
		);
		expect(schema.parse({})).toEqual({});
		const invalidDefault = stringToZod(
			JSON.stringify({
				'x-meseeks-schema-version': 1,
				'type': 'string',
				'minLength': 5,
				'default': 'x',
				'x-zod-prefault': true,
			}),
		);
		expect(invalidDefault.safeParse(undefined).success).toBe(false);
	});

	test('keeps zod 4 output defaults without revalidating or stripping them', () => {
		const schema = z.object({ value: z.string().min(5).default('x'), amount: z.bigint().min(10n).default(0n) });
		expect(stringToZod(zodToString(schema)).parse({})).toEqual(schema.parse({}));
	});

	test('preserves repaired parameterless objects and optional enums with intersected constraints', () => {
		const empty = stringToZod(zodToString(z.object({})));
		expect(empty.parse({ extra: true })).toEqual({});
		for (const value of [undefined, null, [], 'text', 1]) expect(empty.safeParse(value).success).toBe(false);
		const schema = stringToZod(
			JSON.stringify({
				'x-meseeks-schema-version': 1,
				'type': 'object',
				'properties': {
					choice: {
						'allOf': [{ type: 'string', minLength: 5 }, { enum: ['alpha', 'beta'] }],
						'x-zod-optional': true,
					},
				},
			}),
		);
		expect(schema.parse({})).toEqual({});
		expect(schema.parse({ choice: 'alpha' })).toEqual({ choice: 'alpha' });
		for (const choice of ['outside', 'beta', null]) expect(schema.safeParse({ choice }).success).toBe(false);
	});

	test('loads literals, integers and prefaults inside strict objects', () => {
		const schema = stringToZod(
			JSON.stringify({
				'x-meseeks-schema-version': 1,
				'type': 'object',
				'additionalProperties': false,
				'required': ['kind', 'query'],
				'properties': {
					kind: { const: 'search' },
					limit: { 'type': 'integer', 'minimum': 1, 'default': 10, 'x-zod-prefault': true },
					query: { type: 'string', minLength: 1 },
				},
			}),
		);

		expect(schema.parse({ kind: 'search', query: 'hello' })).toEqual({ kind: 'search', query: 'hello', limit: 10 });
		expect(schema.safeParse({ kind: 'other', query: 'hello' }).success).toBe(false);
		expect(schema.safeParse({ kind: 'search', query: 'hello', limit: 1.5 }).success).toBe(false);
		expect(schema.safeParse({ kind: 'search', query: 'hello', extra: true }).success).toBe(false);
	});

	test('preserves passthrough objects and enums', () => {
		const schema = stringToZod(
			JSON.stringify({
				'x-meseeks-schema-version': 1,
				'type': 'object',
				'additionalProperties': true,
				'required': ['kind'],
				'properties': { kind: { type: 'string', enum: ['hard', 'soft'] } },
			}),
		);

		expect(schema.parse({ kind: 'hard', extra: true })).toEqual({ kind: 'hard', extra: true });
		expect(schema.safeParse({ kind: 'other' }).success).toBe(false);
	});

	test('keeps literal-looking default data intact', () => {
		const schema = stringToZod(
			JSON.stringify({
				'x-meseeks-schema-version': 1,
				'type': 'object',
				'properties': { settings: { 'default': { type: 'literal', value: 'data' }, 'x-zod-prefault': true } },
			}),
		);
		expect(schema.parse({})).toEqual({ settings: { type: 'literal', value: 'data' } });
	});

	test('round-trips new schemas with literals, optional fields and collection bounds', () => {
		const schema = z.object({
			kind: z.literal('search'),
			query: z.string().min(1),
			limit: z.number().min(1).default(10),
			tags: z.array(z.string()).max(2).optional(),
		});
		const restored = stringToZod(zodToString(schema));
		expect(restored.parse({ kind: 'search', query: 'hello' })).toEqual(
			schema.parse({ kind: 'search', query: 'hello' }),
		);
		expect(restored.safeParse({ kind: 'search', query: '', tags: ['a', 'b', 'c'] }).success).toBe(false);
	});

	test('preserves integer checks when serializing new skill parameters', () => {
		const schema = z.object({ limit: z.number().int().min(1).max(10) });
		const restored = stringToZod(zodToString(schema));
		expect(restored.parse({ limit: 2 })).toEqual({ limit: 2 });
		expect(restored.safeParse({ limit: 1.5 }).success).toBe(false);
		expect(restored.safeParse({ limit: 0 }).success).toBe(false);
		expect(restored.safeParse({ limit: 11 }).success).toBe(false);
	});

	test('rejects oversized stored collection schemas before accumulating element errors', async () => {
		const schema = stringToZod(
			JSON.stringify({
				'x-meseeks-schema-version': 1,
				'type': 'array',
				'items': { type: 'string' },
				'maxItems': 2,
			}),
		);
		const oversized = Array.from({ length: 10_000 }, () => 123);
		for (const result of [schema.safeParse(oversized), await schema.safeParseAsync(oversized)]) {
			expect(result.success).toBe(false);
			if (result.success) throw new Error('Oversized collection was accepted');
			expect(result.error.issues).toHaveLength(1);
			expect(result.error.issues[0]?.code).toBe('too_big');
		}
	});
});
