import { describe, expect, test } from 'bun:test';
import { convexTest } from 'convex-test';
import { z } from 'zod';
import { executeTool, safeValidateTypes } from '@ai-sdk/provider-utils';
import { tool } from 'ai';
import { normalizeSkillSchema, zodToString } from 'lib/persistedSkillSchema';
import { newSkillSchema, skillSchema } from 'schemas/skill';
import { userSchema } from 'schemas/userSchema';
import { skillInputSchema } from 'skills/inputSchema';
import schema from './schema';

// these mutations do no network i/o, but their transitive imports initialize the app's env schema.
const testEnvironment = {
	SITE_URL: 'https://example.test',
	ENV_TYPE: 'development',
	NODE_ENV: 'development',
	BETTER_AUTH_SECRET: 'test-only-secret-with-at-least-32-characters',
	POLAR_ACCESS_TOKEN: 'test',
	POLAR_WEBHOOK_SECRET: 'test',
	POLAR_SUBSCRIPTION_ID: 'test',
	POLAR_FOUNDER_PACK_ID: 'test',
	POLAR_TOP_UP_ID: 'test',
	PAYMENT_ETH_ADDRESS_BASE_CHAIN: 'test',
	ACTION_COST_USD: '0',
	CHAR_PER_TOKEN: '4',
	COST_PREDICTION_MARGIN: '50',
	AUTH_GOOGLE_ID: 'test',
	AUTH_GOOGLE_SECRET: 'test',
	ALLOWED_DOMAINS: 'example.test',
	ALLOWED_EMAILS: 'test@example.test',
	JWT_SESSION_DURATION_MS: '3600000',
	JWT_SESSION_UPDATE_AGE_MS: '60000',
	GROQ_API_KEY: 'test',
	INCEPTION_API_KEY: 'test',
	MISTRAL_API_KEY: 'test',
	MOONSHOT_API_KEY: 'test',
};
const previousEnvironment = new Map(Object.keys(testEnvironment).map((key) => [key, process.env[key]]));
Object.assign(process.env, testEnvironment);
const { createSkill, findSkillByOwner, replaceProSkills, removeLegacyInputSchemas, updateSkill } =
	await import('./skills.private');
for (const [key, value] of previousEnvironment) {
	if (value === undefined) delete process.env[key];
	else process.env[key] = value;
}

const modules = { './_generated/server.js': () => import('./_generated/server') };
const inputSchema = JSON.stringify({
	$schema: 'https://json-schema.org/draft/2020-12/schema',
	type: 'object',
	properties: { value: { type: 'string', minLength: 1 } },
	required: ['value'],
});
const skill = newSkillSchema.parse({
	key: 'test-skill',
	description: 'test',
	kind: 'hard',
	cost: 0n,
	inputSchema,
	preApprovedCost: 'none',
	config: { url: 'https://example.invalid', method: 'POST', headers: {}, paramMappings: [] },
});
const original = '{"type":"object","properties":{"value":{"type":"string"}}}';

describe('backup removal', () => {
	test('defaults to dry run without changing documents', async () => {
		const t = convexTest(schema, modules);
		const id = await t.run((ctx) =>
			ctx.db.insert('skills', {
				...skill,
				owner: 'isPro',
				author: 'built-in',
				inputSchema: normalizeSkillSchema(inputSchema),
				legacyInputSchema: original,
			}),
		);
		const before = await t.run((ctx) => ctx.db.get(id));
		const result = await t.run((ctx) => removeLegacyInputSchemas(ctx, {}));
		expect(result).toMatchObject({ scanned: 1, eligible: 1, removed: 0, isDone: true });
		expect(await t.run((ctx) => ctx.db.get(id))).toEqual(before);
	});

	test('paginates, preserves every other field and is idempotent', async () => {
		const t = convexTest(schema, modules);
		const ids = await t.run(async (ctx) => {
			const ids = [];
			for (let i = 0; i < 26; i++) {
				ids.push(
					await ctx.db.insert('skills', {
						...skill,
						key: `skill-${i}`,
						owner: 'isPro',
						author: 'built-in',
						cost: 9007199254740993n,
						inputSchema: normalizeSkillSchema(inputSchema),
						legacyInputSchema: original,
					}),
				);
			}
			return ids;
		});
		const before = await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(30));
		const first = await t.run((ctx) => removeLegacyInputSchemas(ctx, { dryRun: false }));
		expect(first).toMatchObject({ scanned: 25, removed: 25, isDone: false });
		const second = await t.run((ctx) =>
			removeLegacyInputSchemas(ctx, { cursor: first.continueCursor, dryRun: false }),
		);
		expect(second).toMatchObject({ scanned: 1, removed: 1, isDone: true });
		for (const expected of before) {
			delete expected.legacyInputSchema;
			expect(await t.run((ctx) => ctx.db.get(expected._id))).toEqual(expected);
		}
		const repeated = await t.run((ctx) => removeLegacyInputSchemas(ctx, { dryRun: false }));
		expect(repeated.removed).toBe(0);
		expect(
			(await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(30))).map((doc) => doc._id),
		).toEqual(ids);
	});

	test('rejects an invalid live schema without removing any backups in the batch', async () => {
		const t = convexTest(schema, modules);
		await t.run(async (ctx) => {
			for (const value of [normalizeSkillSchema(inputSchema), '{}']) {
				await ctx.db.insert('skills', {
					...skill,
					owner: 'isPro',
					author: 'built-in',
					inputSchema: value,
					legacyInputSchema: original,
				});
			}
		});
		const before = await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(3));
		await expect(t.run((ctx) => removeLegacyInputSchemas(ctx, { dryRun: false }))).rejects.toThrow();
		expect(await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(3))).toEqual(before);
	});
});

describe('stored skill schema writes', () => {
	test('creation and editing normalize schemas and preserve recovery copies', async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) => ctx.db.insert('users', userSchema.parse({})));
		const id = await t.run((ctx) => createSkill(ctx, { userId, skill }));
		const created = await t.run((ctx) => ctx.db.get(id));
		expect(created?.inputSchema).toBe(normalizeSkillSchema(inputSchema));
		expect(created?.legacyInputSchema).toBeUndefined();
		await t.run((ctx) => ctx.db.patch(id, { legacyInputSchema: original }));
		await t.run((ctx) => updateSkill(ctx, { userId, skill: { ...skill, description: 'edited' } }));
		const edited = await t.run((ctx) => ctx.db.get(id));
		expect(edited?.description).toBe('edited');
		expect(edited?.inputSchema).toBe(normalizeSkillSchema(inputSchema));
		expect(edited?.legacyInputSchema).toBe(original);
	});

	test('rejects legacy or invalid writes without changing existing documents', async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) => ctx.db.insert('users', userSchema.parse({})));
		const id = await t.run((ctx) =>
			ctx.db.insert('skills', {
				...skill,
				owner: userId,
				author: userId,
				legacyInputSchema: original,
				inputSchema: normalizeSkillSchema(inputSchema),
			}),
		);
		const before = await t.run((ctx) => ctx.db.get(id));
		if (!before) throw new Error('Missing test skill');
		for (const invalid of [original, '{}', 'broken', '{"x-meseeks-schema-version":2,"type":"string"}']) {
			await expect(
				t.run((ctx) =>
					createSkill(ctx, {
						userId,
						skill: { ...skill, key: 'rejected', inputSchema: invalid },
					}),
				),
			).rejects.toThrow();
			await expect(
				t.run((ctx) =>
					updateSkill(ctx, {
						userId,
						skill: { ...skill, description: 'rejected', inputSchema: invalid },
					}),
				),
			).rejects.toThrow();
		}
		expect(await t.run((ctx) => ctx.db.get(id))).toEqual(before);
		expect(await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(10))).toEqual([before]);
	});

	test('catalog imports normalize schemas but cannot insert or overwrite recovery copies', async () => {
		const t = convexTest(schema, modules);
		const catalog = skillSchema.parse({ ...skill, owner: 'isPro', author: 'built-in' });
		const id = await t.run((ctx) => ctx.db.insert('skills', { ...catalog, legacyInputSchema: original }));
		await t.run((ctx) =>
			replaceProSkills(ctx, {
				skills: [
					{ ...catalog, legacyInputSchema: 'incoming' },
					{ ...catalog, key: 'new-catalog-skill', legacyInputSchema: 'incoming' },
				],
			}),
		);
		const existing = await t.run((ctx) => ctx.db.get(id));
		const created = await t.run((ctx) => findSkillByOwner(ctx, { owner: 'isPro', key: 'new-catalog-skill' }));
		expect(existing?.legacyInputSchema).toBe(original);
		expect(existing?.inputSchema).toBe(normalizeSkillSchema(inputSchema));
		expect(created?.legacyInputSchema).toBeUndefined();
		expect(created?.inputSchema).toBe(normalizeSkillSchema(inputSchema));
		const before = await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(10));
		await expect(
			t.run((ctx) =>
				replaceProSkills(ctx, {
					skills: [
						{ ...catalog, description: 'must not be applied' },
						{ ...catalog, key: 'invalid', inputSchema: original },
					],
				}),
			),
		).rejects.toThrow();
		expect(await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(10))).toEqual(before);
	});

	test('persisted bigint arguments execute through the same ai sdk validator as JSON input', async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) => ctx.db.insert('users', userSchema.parse({})));
		const parameters = z.object({ amount: z.bigint().gt(9007199254740992n) });
		const bigintSkill = newSkillSchema.parse({
			...skill,
			inputSchema: zodToString(parameters),
			config: {
				url: 'https://example.invalid',
				method: 'POST',
				headers: {},
				paramMappings: [],
				body: { template: { amount: 9007199254740993n } },
			},
		});
		const id = await t.run((ctx) => createSkill(ctx, { userId, skill: bigintSkill }));
		await t.run((ctx) => updateSkill(ctx, { userId, skill: { ...bigintSkill, description: 'edited' } }));
		const stored = await t.run((ctx) => ctx.db.get(id));
		if (!stored || stored.kind !== 'hard') throw new Error('Missing test skill');
		expect(stored.config.body?.template?.amount).toBe(9007199254740993n);
		const echo = tool({
			inputSchema: skillInputSchema(stored.inputSchema),
			execute: async (args) => String(parameters.parse(args).amount),
		});
		for (const value of [{ amount: '9007199254740993' }, stored.config.body?.template]) {
			const parsed = await safeValidateTypes({ schema: echo.inputSchema, value });
			if (!parsed.success || !echo.execute) throw new Error('Bigint validation failed');
			const output: unknown[] = [];
			for await (const part of executeTool({
				execute: echo.execute,
				input: parsed.value,
				options: { toolCallId: 'test', messages: [] },
			})) {
				if (part.type === 'final') output.push(part.output);
			}
			expect(output).toEqual(['9007199254740993']);
		}
		for (const amount of ['9007199254740992', 9007199254740992, '1.5']) {
			expect((await safeValidateTypes({ schema: echo.inputSchema, value: { amount } })).success).toBe(false);
		}
	});
});
