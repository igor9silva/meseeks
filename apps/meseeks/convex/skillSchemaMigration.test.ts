import { describe, expect, spyOn, test } from 'bun:test';
import { convexTest } from 'convex-test';
import { inspectSkillSchema } from 'lib/skillSchemaMigration';
import { newSkillSchema } from 'schemas/skillSchema';
import { userSchema } from 'schemas/userSchema';
import type { FunctionReturnType } from 'convex/server';
import { components, internal } from './_generated/api';
import authSchema from '../node_modules/@convex-dev/better-auth/src/component/schema';
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
const { createSkill, migrateInputSchema, replaceProSkills, updateSkill } = await import('./skills.private');
for (const [key, value] of previousEnvironment) {
	if (value === undefined) delete process.env[key];
	else process.env[key] = value;
}

const modules = {
	'./_generated/server.js': () => import('./_generated/server'),
	'./migrations.ts': () => import('./migrations'),
};
const legacy = JSON.stringify({
	type: 'object',
	properties: { amount: { type: 'bigInt', min: '0', minInclusive: true } },
});
const skill = newSkillSchema.parse({
	key: 'test-skill',
	description: 'test',
	kind: 'hard',
	cost: 0n,
	inputSchema: legacy,
	preApprovedCost: 'none',
	config: { url: 'https://example.com', method: 'POST', headers: {}, paramMappings: [] },
});

describe('stored schema writes and migration', () => {
	test('creation and updates always normalize legacy input', async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) => ctx.db.insert('users', userSchema.parse({})));
		const id = await t.run((ctx) => createSkill(ctx, { userId, skill }));
		const created = await t.run((ctx) => ctx.db.get(id));
		expect(created && inspectSkillSchema(created.inputSchema).status).toBe('current');
		await t.run((ctx) => updateSkill(ctx, { userId, skill: { ...skill, description: 'edited' } }));
		const edited = await t.run((ctx) => ctx.db.get(id));
		expect(edited?.description).toBe('edited');
		expect(edited && inspectSkillSchema(edited.inputSchema).status).toBe('current');
	});

	test('migration backs up the latest value and reruns preserve edits and backups', async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) => ctx.db.insert('users', userSchema.parse({})));
		const id = await t.run((ctx) => ctx.db.insert('skills', { ...skill, author: userId, owner: userId }));
		const updatedLegacy = JSON.stringify({ type: 'object', properties: { text: { type: 'string' } } });
		await t.run((ctx) => ctx.db.patch(id, { inputSchema: updatedLegacy, description: 'latest' }));
		await t.run((ctx) => migrateInputSchema(ctx, { skillId: id }));
		const migrated = await t.run((ctx) => ctx.db.get(id));
		expect(migrated?.legacyInputSchema).toBe(updatedLegacy);
		expect(migrated?.description).toBe('latest');
		await t.run((ctx) => migrateInputSchema(ctx, { skillId: id }));
		expect(await t.run((ctx) => ctx.db.get(id))).toEqual(migrated);
	});

	test('blocked conversion leaves the original document untouched', async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) => ctx.db.insert('users', userSchema.parse({})));
		const id = await t.run((ctx) =>
			ctx.db.insert('skills', { ...skill, author: userId, owner: userId, inputSchema: '{"type":"date"}' }),
		);
		await expect(t.run((ctx) => migrateInputSchema(ctx, { skillId: id }))).rejects.toThrow('unsupported legacy');
		const doc = await t.run((ctx) => ctx.db.get(id));
		expect(doc?.inputSchema).toBe('{"type":"date"}');
		expect(doc?.legacyInputSchema).toBeUndefined();
	});

	test('dry run rolls back one batch with bigint fields without logging documents', async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) => ctx.db.insert('users', userSchema.parse({})));
		const ids = await t.run(async (ctx) => {
			const ids = [];
			for (let i = 0; i < 26; i++) {
				ids.push(await ctx.db.insert('skills', { ...skill, key: `dry-${i}`, author: userId, owner: userId }));
			}
			return ids;
		});
		const before = await t.run((ctx) => Promise.all(ids.map((id) => ctx.db.get(id))));
		const debug = spyOn(console, 'debug');
		try {
			await expect(
				t.mutation(internal.migrations._runSkillSchemaMigration, { dryRun: true }),
			).rejects.toMatchObject({ data: { kind: 'DRY RUN', processed: 25, isDone: false } });
			expect(debug).not.toHaveBeenCalled();
		} finally {
			debug.mockRestore();
		}
		expect(await t.run((ctx) => Promise.all(ids.map((id) => ctx.db.get(id))))).toEqual(before);
	});

	test('catalog imports normalize schemas and cannot overwrite recovery copies', async () => {
		const t = convexTest(schema, modules);
		const catalog = { ...skill, owner: 'isPro' as const, author: 'built-in' as const };
		const id = await t.run((ctx) => ctx.db.insert('skills', { ...catalog, legacyInputSchema: 'original' }));
		await t.run((ctx) => replaceProSkills(ctx, { skills: [{ ...catalog, legacyInputSchema: 'incoming' }] }));
		const doc = await t.run((ctx) => ctx.db.get(id));
		expect(doc?.legacyInputSchema).toBe('original');
		expect(doc && inspectSkillSchema(doc.inputSchema).status).toBe('current');
	});

	test('deployed rollout verification exercises writes and bigint tools but always rolls back', async () => {
		const t = convexTest(schema, modules);
		await t.run((ctx) => ctx.db.insert('users', userSchema.parse({})));
		const catalog = {
			...skill,
			owner: 'isPro' as const,
			author: 'built-in' as const,
			legacyInputSchema: 'original',
		};
		const id = await t.run((ctx) => ctx.db.insert('skills', catalog));
		const before = await t.run((ctx) => ctx.db.get(id));
		if (!before) throw new Error('Missing test skill');
		await expect(t.mutation(internal.migrations._verifySkillSchemaRollout, {})).rejects.toMatchObject({
			data: {
				kind: 'VERIFIED ROLLBACK',
				create: true,
				edit: true,
				catalog: true,
				bigintTool: true,
				builtIns: 23,
			},
		});
		expect(await t.run((ctx) => ctx.db.query('skills').collect())).toEqual([before]);
	});

	test('rollout verification on empty previews rolls back its account fixture across components', async () => {
		const t = convexTest(schema, modules);
		t.registerComponent('betterAuth', authSchema, {
			'./_generated/server.js': () =>
				import('../node_modules/@convex-dev/better-auth/src/component/_generated/server'),
			'./adapter.js': () => import('@convex-dev/better-auth/adapter'),
		});
		await expect(t.mutation(internal.migrations._verifySkillSchemaRollout, {})).rejects.toMatchObject({
			data: {
				kind: 'VERIFIED ROLLBACK',
				create: true,
				edit: true,
				catalog: true,
				bigintTool: true,
				builtIns: 23,
			},
		});
		for (const table of ['skills', 'users', 'transactions', 'user_preferences'] as const) {
			expect(await t.run((ctx) => ctx.db.query(table).collect())).toEqual([]);
		}
		expect(
			await t.query(components.betterAuth.adapter.findMany, {
				model: 'user',
				paginationOpts: { cursor: null, numItems: 5 },
			}),
		).toMatchObject({ page: [] });
	});

	test('read-only audit paginates all records and classifies invalid ones', async () => {
		const t = convexTest(schema, modules);
		const userId = await t.run((ctx) => ctx.db.insert('users', userSchema.parse({})));
		await t.run((ctx) => ctx.db.insert('skills', { ...skill, owner: userId, author: userId }));
		await t.run((ctx) =>
			ctx.db.insert('skills', { ...skill, key: 'blocked', owner: userId, author: userId, inputSchema: 'broken' }),
		);
		await t.run((ctx) => createSkill(ctx, { userId, skill: { ...skill, key: 'new-skill' } }));
		const statuses: string[] = [];
		let cursor: string | null = null;
		for (;;) {
			const page: FunctionReturnType<typeof internal.migrations._auditSkillSchemas> = await t.query(
				internal.migrations._auditSkillSchemas,
				{ paginationOpts: { cursor, numItems: 1 } },
			);
			statuses.push(...page.page.map((entry) => entry.status));
			if (page.isDone) break;
			cursor = page.continueCursor;
		}
		expect(statuses.sort()).toEqual(['blocked', 'current', 'ready']);
	});
});
