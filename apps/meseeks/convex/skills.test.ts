import { describe, expect, test } from 'bun:test';
import { convexTest } from 'convex-test';
import { z } from 'zod';
import { executeTool, safeValidateTypes } from '@ai-sdk/provider-utils';
import { tool } from 'ai';
import { normalizeSkillSchema, zodToString } from 'lib/persistedSkillSchema';
import { hardSkillSchema, newSkillSchema, skillSchema } from 'schemas/skill';
import { userSchema } from 'schemas/userSchema';
import { skillInputSchema } from 'skills/inputSchema';
import schema from './schema';
import { components, internal } from './_generated/api';
import { createFunctionHandle, getFunctionName } from 'convex/server';
import migrationSchema from '../node_modules/@convex-dev/migrations/src/component/schema';

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
const { createSkill, findSkillByOwner, replaceProSkills, updateSkill } = await import('./skills.private');
for (const [key, value] of previousEnvironment) {
	if (value === undefined) delete process.env[key];
	else process.env[key] = value;
}

const modules = {
	'./_generated/server.js': () => import('./_generated/server'),
	'./migrations.ts': () => import('./migrations'),
};
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
const migrationName = getFunctionName(internal.migrations._removeSkillSchemaBackups);

const migrationSkill = hardSkillSchema.parse({
	...skill,
	owner: 'isPro',
	author: 'built-in',
	inputSchema: normalizeSkillSchema(inputSchema),
	legacyInputSchema: original,
	config: { ...skill.config, body: { template: { amount: 9007199254740993n } } },
});

function migrationTest() {
	// bun does not transform the component test helper's import.meta.glob; register its real modules directly.
	const t = convexTest(schema, modules);
	t.registerComponent('migrations', migrationSchema, {
		'./lib.ts': () => import('../node_modules/@convex-dev/migrations/src/component/lib'),
		'./_generated/server.ts': () =>
			import('../node_modules/@convex-dev/migrations/src/component/_generated/server'),
	});
	return t;
}

describe('skill schema backup migration', () => {
	test('the pipeline completes every batch, preserves other fields and does not restart a completed migration', async () => {
		const t = migrationTest();
		await t.run(async (ctx) => {
			for (let i = 0; i < 27; i++) {
				await ctx.db.insert('skills', { ...migrationSkill, key: `cleanup-${i}` });
			}
		});
		const before = await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(30));
		await t.action(internal.migrations._runSkillSchemaBackupMigration, {});
		for (const expected of before) delete expected.legacyInputSchema;
		expect(await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(30))).toEqual(before);
		const status = await t.query(components.migrations.lib.getStatus, {
			names: [migrationName],
		});
		expect(status).toMatchObject([{ isDone: true, state: 'success', processed: 27 }]);
		await t.action(internal.migrations._runSkillSchemaBackupMigration, {});
		expect(await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(30))).toEqual(before);
		expect(await t.query(components.migrations.lib.getStatus, { names: [migrationName] })).toEqual(status);
	});

	test('an invalid schema on a later audit page prevents all migration writes', async () => {
		const t = migrationTest();
		await t.run(async (ctx) => {
			for (let i = 0; i < 26; i++) {
				const currentSchema = i === 25 ? '{}' : normalizeSkillSchema(inputSchema);
				await ctx.db.insert('skills', { ...migrationSkill, key: `blocked-${i}`, inputSchema: currentSchema });
			}
		});
		const before = await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(30));
		await expect(t.action(internal.migrations._runSkillSchemaBackupMigration, {})).rejects.toThrow();
		expect(await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(30))).toEqual(before);
	});

	test('the component records failure and resumes from the last committed batch', async () => {
		const t = migrationTest();
		const ids = await t.run(async (ctx) => {
			const ids = [];
			for (let i = 0; i < 27; i++) {
				const currentSchema = i === 26 ? '{}' : normalizeSkillSchema(inputSchema);
				ids.push(
					await ctx.db.insert('skills', {
						...migrationSkill,
						key: `resume-${i}`,
						inputSchema: currentSchema,
					}),
				);
			}
			return ids;
		});
		const fnHandle = await t.run(() => createFunctionHandle(internal.migrations._removeSkillSchemaBackups));
		const args = { name: migrationName, fnHandle, oneBatchOnly: true, dryRun: false };
		// separate component calls reproduce the committed batches of a deployment action.
		expect(await t.mutation(components.migrations.lib.migrate, args)).toMatchObject({
			processed: 25,
			isDone: false,
		});
		expect(await t.mutation(components.migrations.lib.migrate, args)).toMatchObject({
			state: 'failed',
			processed: 25,
		});
		expect(await t.query(components.migrations.lib.getStatus, { names: [migrationName] })).toMatchObject([
			{ isDone: false, state: 'failed', processed: 25 },
		]);
		expect(
			(await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(30))).filter(
				(doc) => doc.legacyInputSchema !== undefined,
			),
		).toHaveLength(2);
		await t.run((ctx) => ctx.db.patch(ids[26], { inputSchema: normalizeSkillSchema(inputSchema) }));
		await t.action(internal.migrations._runSkillSchemaBackupMigration, {});
		expect(await t.query(components.migrations.lib.getStatus, { names: [migrationName] })).toMatchObject([
			{ isDone: true, state: 'success', processed: 27 },
		]);
		expect(
			(await t.run((ctx) => ctx.db.query('skills').withIndex('by_owner_kind').take(30))).every(
				(doc) => doc.legacyInputSchema === undefined,
			),
		).toBe(true);
	});

	test('fails verification instead of silently restarting when a writer reintroduces a backup', async () => {
		const t = migrationTest();
		await t.action(internal.migrations._runSkillSchemaBackupMigration, {});
		const id = await t.run((ctx) => ctx.db.insert('skills', migrationSkill));
		await expect(t.action(internal.migrations._runSkillSchemaBackupMigration, {})).rejects.toThrow(
			'Skill schema backups remain after migration',
		);
		expect((await t.run((ctx) => ctx.db.get(id)))?.legacyInputSchema).toBe(original);
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
