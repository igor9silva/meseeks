import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { stringToZod, zodToString } from './zodToString';

describe('stored skill schemas', () => {
	test('loads legacy literals, integers and defaults inside strict objects', () => {
		const schema = stringToZod(
			JSON.stringify({
				type: 'object',
				unknownKeys: 'strict',
				properties: {
					kind: { type: 'literal', value: 'search' },
					limit: { type: 'number', int: true, min: 1, minInclusive: true, defaultValue: 10 },
					query: { type: 'string', min: 1 },
				},
			}),
		);

		expect(schema.parse({ kind: 'search', query: 'hello' })).toEqual({ kind: 'search', query: 'hello', limit: 10 });
		expect(schema.safeParse({ kind: 'other', query: 'hello' }).success).toBe(false);
		expect(schema.safeParse({ kind: 'search', query: 'hello', limit: 1.5 }).success).toBe(false);
		expect(schema.safeParse({ kind: 'search', query: 'hello', extra: true }).success).toBe(false);
	});

	test('preserves legacy passthrough objects and native enums', () => {
		const schema = stringToZod(
			JSON.stringify({
				type: 'object',
				unknownKeys: 'passthrough',
				properties: { kind: { type: 'nativeEnum', values: { hard: 'hard', soft: 'soft' } } },
			}),
		);

		expect(schema.parse({ kind: 'hard', extra: true })).toEqual({ kind: 'hard', extra: true });
		expect(schema.safeParse({ kind: 'other' }).success).toBe(false);
	});

	test('loads legacy discriminated unions and references', () => {
		const schema = stringToZod(
			JSON.stringify({
				type: 'discriminatedUnion',
				discriminator: 'kind',
				options: [
					{
						type: 'object',
						properties: { kind: { type: 'literal', value: 'search' }, query: { type: 'string' } },
					},
					{
						type: 'object',
						properties: { kind: { type: 'literal', value: 'count' }, count: { type: 'number' } },
					},
				],
			}),
		);
		expect(schema.parse({ kind: 'count', count: 2 })).toEqual({ kind: 'count', count: 2 });
		expect(schema.safeParse({ kind: 'search', count: 2 }).success).toBe(false);

		const references = stringToZod(
			JSON.stringify({
				type: 'object',
				properties: {
					first: { type: 'string', min: 1 },
					second: { $ref: '#/properties/first' },
				},
			}),
		);
		expect(references.safeParse({ first: 'a', second: '' }).success).toBe(false);
		expect(references.parse({ first: 'a', second: 'b' })).toEqual({ first: 'a', second: 'b' });
	});

	test('keeps literal-looking default data intact', () => {
		const schema = stringToZod(
			JSON.stringify({
				type: 'object',
				properties: { settings: { type: 'unknown', defaultValue: { type: 'literal', value: 'data' } } },
			}),
		);
		expect(schema.parse({})).toEqual({ settings: { type: 'literal', value: 'data' } });
	});

	test('retains the legacy behavior for effects without implementations', () => {
		const schema = stringToZod(
			JSON.stringify({
				type: 'effect',
				inner: { type: 'string', min: 1 },
				effects: [{ type: 'transform', name: 'unused' }],
				isOptional: true,
			}),
		);
		expect(schema.parse('hello')).toBe('hello');
		expect(schema.parse(undefined)).toBeUndefined();
		expect(schema.safeParse('').success).toBe(false);
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
		const schema = stringToZod(JSON.stringify({ type: 'array', element: { type: 'string' }, maxLength: 2 }));
		const oversized = Array.from({ length: 10_000 }, () => 123);
		for (const result of [schema.safeParse(oversized), await schema.safeParseAsync(oversized)]) {
			expect(result.success).toBe(false);
			if (result.success) throw new Error('Oversized collection was accepted');
			expect(result.error.issues).toHaveLength(1);
			expect(result.error.issues[0]?.code).toBe('too_big');
		}
	});
});
