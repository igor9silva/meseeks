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

	test('blocks required lists that contradict legacy optionality', () => {
		for (const required of [[], ['missing'], ['value', 'value'], ['value', 'optional'], 'value']) {
			const inputSchema = JSON.stringify({
				type: 'object',
				properties: {
					value: { type: 'string' },
					optional: { type: 'string', isOptional: true },
				},
				required,
			});
			expect(inspectSkillSchema(inputSchema).status).toBe('blocked');
			expect(() => prepareSkillSchemaMigration({ inputSchema })).toThrow();
		}
	});

	test('repairs approved empty root schemas as parameterless skills and preserves their backups', () => {
		const patch = prepareSkillSchemaMigration({ inputSchema: '{}' });
		if (!patch) throw new Error('Expected a migration');
		expect(patch.legacyInputSchema).toBe('{}');
		expect(prepareSkillSchemaMigration(patch)).toBeUndefined();
		for (const stored of ['{}', patch.inputSchema]) {
			const schema = stringToZod(stored);
			expect(schema.parse({})).toEqual({});
			expect(schema.parse({ extra: true })).toEqual({});
			for (const input of [undefined, null, [], 'text', 1]) expect(schema.safeParse(input).success).toBe(false);
		}
		// the repair applies only to empty roots, not arbitrary missing types in nested schemas.
		expect(inspectSkillSchema('{"type":"object","properties":{"value":{}}}').status).toBe('blocked');
		expect(inspectSkillSchema('{"description":"missing type"}').status).toBe('blocked');
	});

	test('enforces approved legacy string enums while preserving optionality and other constraints', () => {
		const inputSchema = JSON.stringify({
			type: 'object',
			properties: {
				choice: { type: 'string', enum: ['alpha', 'beta'], min: 5, isOptional: true },
			},
		});
		const patch = prepareSkillSchemaMigration({ inputSchema });
		if (!patch) throw new Error('Expected a migration');
		expect(patch.legacyInputSchema).toBe(inputSchema);
		expect(prepareSkillSchemaMigration(patch)).toBeUndefined();
		for (const stored of [inputSchema, patch.inputSchema]) {
			const schema = stringToZod(stored);
			expect(schema.parse({})).toEqual({});
			expect(schema.parse({ choice: 'alpha' })).toEqual({ choice: 'alpha' });
			expect(schema.safeParse({ choice: 'outside' }).success).toBe(false);
			expect(schema.safeParse({ choice: 'beta' }).success).toBe(false);
			expect(schema.safeParse({ choice: null }).success).toBe(false);
		}
		for (const values of [[], [1], 'alpha']) {
			expect(inspectSkillSchema(JSON.stringify({ type: 'string', enum: values })).status).toBe('blocked');
		}
	});

	test('keeps zod 4 output defaults without revalidating or stripping them', () => {
		const schema = z.object({ value: z.string().min(5).default('x'), amount: z.bigint().min(10n).default(0n) });
		expect(stringToZod(zodToString(schema)).parse({})).toEqual(schema.parse({}));
	});
});
