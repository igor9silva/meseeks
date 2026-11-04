import { describe, expect, test } from 'bun:test';
import { safeValidateTypes } from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { normalizeSkillSchema, stringToZod, zodToString } from 'lib/zodToString';
import { skillInputSchema } from './inputSchema';
import { _builtInSkills } from './builtIn';

describe('skill json codecs', () => {
	test('every built-in can be stored and advertised through the ai sdk', async () => {
		for (const skill of Object.values(_builtInSkills)) {
			const stored = zodToString(skill.parameters);
			expect(() => stringToZod(stored)).not.toThrow();
			const providerSchema = await skillInputSchema(skill.parameters).jsonSchema;
			expect(providerSchema.type).toBe('object');
			expect(JSON.stringify(providerSchema)).not.toContain('x-codec');
		}
	});

	test('validates bigint bounds, multiples and exact integers through ai sdk', async () => {
		const original = z.object({ amount: z.bigint().gt(9007199254740992n).lt(9007199254741000n).multipleOf(3n) });
		for (const input of [original, zodToString(original)]) {
			const schema = skillInputSchema(input);
			for (const amount of ['9007199254740993', 9007199254740993n]) {
				const result = await safeValidateTypes({ schema, value: { amount } });
				expect(result.success).toBe(true);
				if (result.success) expect(result.value).toEqual({ amount: 9007199254740993n });
			}
			for (const amount of [
				'9007199254740992',
				'9007199254740994',
				'9007199254741000',
				'1.5',
				'',
				'abc',
				'01',
				9007199254740992,
			]) {
				expect((await safeValidateTypes({ schema, value: { amount } })).success).toBe(false);
			}
		}
	});

	test('decodes only tagged fields in nested collections, unions and references', () => {
		const child = z.object({ amount: z.bigint(), text: z.string(), unknown: z.unknown().optional() });
		const original = z.object({
			children: z.array(child).max(2),
			byKey: z.record(z.string(), child),
			choice: z.union([z.bigint(), z.literal('none')]),
		});
		const restored = stringToZod(zodToString(original));
		const value = { amount: '42', text: '42', unknown: '42', extra: true };
		expect(restored.parse({ children: [value], byKey: { first: value }, choice: 'none' })).toEqual({
			children: [{ amount: 42n, text: '42', unknown: '42' }],
			byKey: { first: { amount: 42n, text: '42', unknown: '42' } },
			choice: 'none',
		});
		const legacy = JSON.stringify({
			type: 'object',
			properties: { first: { type: 'bigInt' }, second: { $ref: '#/properties/first' } },
		});
		expect(stringToZod(normalizeSkillSchema(legacy)).parse({ first: '42', second: 43n })).toEqual({
			first: 42n,
			second: 43n,
		});
	});

	test('invalid decimal input returns a validation error instead of throwing', () => {
		const schema = stringToZod(
			JSON.stringify({
				'$schema': 'https://json-schema.org/draft/2020-12/schema',
				'type': 'string',
				'x-codec': 'bigint-decimal-v1',
			}),
		);
		expect(schema.safeParse('not a number').success).toBe(false);
	});

	test('preserves exclusive unions after hydrating nested schemas', () => {
		const schema = stringToZod(
			JSON.stringify({
				$schema: 'https://json-schema.org/draft/2020-12/schema',
				oneOf: [{ type: 'number' }, { type: 'integer' }],
			}),
		);
		expect(schema.safeParse(1).success).toBe(false);
		expect(schema.safeParse(1.5).success).toBe(true);
	});

	test('enforces collection bounds even when item types are unconstrained', async () => {
		const document = JSON.stringify({
			$schema: 'https://json-schema.org/draft/2020-12/schema',
			type: 'array',
			minItems: 1,
			maxItems: 2,
		});
		for (const stored of [document, normalizeSkillSchema(document)]) {
			const schema = skillInputSchema(stored);
			expect((await safeValidateTypes({ schema, value: [] })).success).toBe(false);
			expect((await safeValidateTypes({ schema, value: [1, 'two'] })).success).toBe(true);
			expect((await safeValidateTypes({ schema, value: [1, 2, 3] })).success).toBe(false);
			expect((await schema.jsonSchema).maxItems).toBe(2);
		}
	});
});
