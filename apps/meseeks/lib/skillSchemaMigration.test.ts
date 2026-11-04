import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { inspectSkillSchema, prepareSkillSchemaMigration } from './skillSchemaMigration';
import { normalizeSkillSchema, stringToZod, zodToString } from './zodToString';

describe('skill schema migration', () => {
	const legacy = JSON.stringify({
		type: 'object',
		properties: {
			amount: { type: 'bigInt', min: '9007199254740993', minInclusive: true },
			enabled: { type: 'boolean', defaultValue: true },
		},
	});

	test('backs up the original, converts exact bounds and is idempotent', () => {
		const patch = prepareSkillSchemaMigration({ inputSchema: legacy });
		expect(patch?.legacyInputSchema).toBe(legacy);
		if (!patch) throw new Error('Expected a migration');
		expect(prepareSkillSchemaMigration(patch)).toBeUndefined();
		expect(normalizeSkillSchema(patch.inputSchema)).toBe(patch.inputSchema);
		const restored = stringToZod(patch.inputSchema);
		expect(restored.parse({ amount: 9007199254740993n, extra: 'discard' })).toEqual({
			amount: 9007199254740993n,
			enabled: true,
		});
		expect(restored.parse({ amount: '9007199254740993' })).toEqual({ amount: 9007199254740993n, enabled: true });
		expect(restored.safeParse({ amount: '9007199254740992' }).success).toBe(false);
		expect(
			prepareSkillSchemaMigration({ inputSchema: legacy, legacyInputSchema: 'original' })?.legacyInputSchema,
		).toBe('original');
	});

	test('audits mixed data and blocks unsupported constructs or versions', () => {
		expect(inspectSkillSchema(legacy).status).toBe('ready');
		expect(inspectSkillSchema(zodToString(z.object({})))).toEqual({ status: 'current' });
		for (const value of [
			'not json',
			'{"type":"date"}',
			'{"type":"string","trim":true}',
			'{"x-meseeks-schema-version":2,"type":"string"}',
			'{"x-meseeks-schema-version":1,"type":"string","x-codec":"unknown"}',
		]) {
			expect(inspectSkillSchema(value).status).toBe('blocked');
			expect(() => prepareSkillSchemaMigration({ inputSchema: value })).toThrow();
		}
	});

	test('preserves legacy optional/default precedence and validates legacy defaults', () => {
		const optional = JSON.stringify({
			type: 'object',
			properties: { value: { type: 'string', defaultValue: 'hello', isOptional: true } },
		});
		expect(stringToZod(normalizeSkillSchema(optional)).parse({})).toEqual({});
		const invalidDefault = JSON.stringify({ type: 'string', min: 5, defaultValue: 'x' });
		expect(stringToZod(invalidDefault).safeParse(undefined).success).toBe(false);
	});

	test('keeps zod 4 output defaults without revalidating or stripping them', () => {
		const schema = z.object({ value: z.string().min(5).default('x'), amount: z.bigint().min(10n).default(0n) });
		expect(stringToZod(zodToString(schema)).parse({})).toEqual(schema.parse({}));
	});
});
