import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import fixtures from './fixtures/skill-schemas.json';
import { normalizeSkillSchema, stringToZod } from './persistedSkillSchema';

// expected results come from unpatched zodex 3 / zod 3; fixtures now store their migrated json schemas.
const cases = z
	.array(
		z.object({
			name: z.string(),
			schema: z.json(),
			cases: z.array(z.object({ input: z.json(), success: z.boolean(), output: z.json().optional() })),
		}),
	)
	.parse(fixtures);

function decode(value: z.JSONType): unknown {
	if (Array.isArray(value)) return value.map(decode);
	if (value !== null && typeof value === 'object') {
		if (typeof value.$bigint === 'string') return BigInt(value.$bigint);
		if (value.$undefined === true) return undefined;
		return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, decode(child)]));
	}
	return value;
}

describe('migrated schema semantics', () => {
	for (const fixture of cases) {
		test(fixture.name, () => {
			const stored = JSON.stringify(fixture.schema);
			for (const document of [stored, normalizeSkillSchema(stored)]) {
				const schema = stringToZod(document);
				for (const example of fixture.cases) {
					const actual = schema.safeParse(decode(example.input));
					expect(actual.success).toBe(example.success);
					if (actual.success && example.success) expect(actual.data).toEqual(decode(example.output ?? null));
				}
			}
		});
	}
});
