import { Migrations } from '@convex-dev/migrations';
import { ConvexError } from 'convex/values';
import { z } from 'zod';
import { executeTool, safeValidateTypes } from '@ai-sdk/provider-utils';
import { tool } from 'ai';
import { components, internal } from './_generated/api.js';
import { DataModel } from './_generated/dataModel.js';
import {
	createSkill,
	enableSkill,
	findSkillByOwner,
	migrateInputSchema,
	replaceProSkills,
	updateSkill,
} from './skills.private';
import { internalMutation, internalQuery } from 'lib/convex';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import { inspectSkillSchema } from 'lib/skillSchemaMigration';
import { newSkillSchema } from 'schemas/skillSchema';
import { skillInputSchema } from 'skills/inputSchema';
import { _builtInSkills } from 'skills/builtIn';
import { addUser } from './users.private';

// Temporary rollout check. Every path throws, so no synthetic skills or catalog edits can commit.
export const _verifySkillSchemaRollout = internalMutation({
	args: {},
	returns: z.null(),
	handler: async (ctx): Promise<null> => {
		const user = await ctx.db.query('users').withIndex('by_creation_time').first();
		const key = `schema-rollout-${crypto.randomUUID()}`;
		let userId = user?._id;
		if (!userId) {
			// Empty previews have no account. Both the component fixture and app writes roll back together.
			const email = `${key}@example.invalid`;
			const authUser = z.object({ _id: z.string() }).parse(
				await ctx.runMutation(components.betterAuth.adapter.create, {
					input: {
						model: 'user',
						data: { name: key, email, emailVerified: false, createdAt: Date.now(), updatedAt: Date.now() },
					},
				}),
			);
			userId = await addUser(ctx, { authUserId: authUser._id, email, name: key });
		}
		const original = JSON.stringify({
			type: 'object',
			properties: { amount: { type: 'bigInt', min: '9007199254740992', minInclusive: false } },
		});
		const skill = newSkillSchema.parse({
			key,
			description: 'Temporary schema rollout verification',
			kind: 'hard',
			cost: 0n,
			inputSchema: original,
			preApprovedCost: 'none',
			config: {
				url: 'https://example.invalid',
				method: 'POST',
				headers: {},
				paramMappings: [],
				body: { template: { amount: 9007199254740993n } },
			},
		});
		const id = await createSkill(ctx, { userId, skill });
		const created = await ctx.db.get(id);
		if (!created || inspectSkillSchema(created.inputSchema).status !== 'current') throw new Error('Create failed');
		await updateSkill(ctx, {
			userId,
			skill: { ...skill, description: 'Edited', inputSchema: created.inputSchema },
		});
		const edited = await ctx.db.get(id);
		if (!edited || edited.description !== 'Edited' || inspectSkillSchema(edited.inputSchema).status !== 'current') {
			throw new Error('Edit failed');
		}
		if (edited.kind !== 'hard' || edited.config.body?.template?.amount !== 9007199254740993n) {
			throw new Error('Persisted bigint changed');
		}
		const echo = tool({
			inputSchema: skillInputSchema(edited.inputSchema),
			execute: async (args) => String(z.object({ amount: z.bigint() }).parse(args).amount),
		});
		for (const value of [{ amount: '9007199254740993' }, edited.config.body.template]) {
			const parsed = await safeValidateTypes({ schema: echo.inputSchema, value });
			if (!parsed.success || !echo.execute) throw new Error('Bigint validation failed');
			let output: unknown;
			for await (const part of executeTool({
				execute: echo.execute,
				input: parsed.value,
				options: { toolCallId: key, messages: [] },
			})) {
				if (part.type === 'final') output = part.output;
			}
			if (output !== '9007199254740993') throw new Error('Tool bigint output changed');
		}
		for (const amount of ['9007199254740992', 9007199254740992, '1.5']) {
			if ((await safeValidateTypes({ schema: echo.inputSchema, value: { amount } })).success) {
				throw new Error('Invalid bigint accepted');
			}
		}
		let builtIns = 0;
		for (const builtIn of Object.values(_builtInSkills)) {
			const advertised = await skillInputSchema(builtIn.parameters).jsonSchema;
			if (advertised.type !== 'object' || JSON.stringify(advertised).includes('"x-codec"')) {
				throw new Error('Built-in tool schema invalid');
			}
			builtIns++;
		}
		const catalog = await ctx.db
			.query('skills')
			.withIndex('by_owner_kind', (q) => q.eq('owner', 'isPro'))
			.take(501);
		if (catalog.length > 500) throw new Error('Catalog exceeds rollout verification bound');
		await replaceProSkills(ctx, { skills: [...catalog, { ...skill, owner: 'isPro', author: 'built-in' }] });
		const imported = await findSkillByOwner(ctx, { owner: 'isPro', key });
		if (!imported || inspectSkillSchema(imported.inputSchema).status !== 'current')
			throw new Error('Catalog import failed');
		for (const before of catalog) {
			const after = await ctx.db.get(before._id);
			if (!after || after.legacyInputSchema !== before.legacyInputSchema)
				throw new Error('Catalog backup changed');
		}
		throw new ConvexError({
			kind: 'VERIFIED ROLLBACK',
			create: true,
			edit: true,
			catalog: true,
			bigintTool: true,
			builtIns,
		});
	},
});

export const migrations = new Migrations<DataModel>(components.migrations);

// TODO: break down into files, stop removing them thats dumb

// Migration to enable specific skills for all existing users
export const enableMissingSkillsFour = migrations.define({
	table: 'users',
	migrateOne: async (ctx, doc) => {
		//
		const skillsToEnable = ['transcribeYouTube', 'describeYouTube', 'compose'];

		// Enable each skill for this user
		for (const skillKey of skillsToEnable) {
			await enableSkill(ctx, {
				userId: doc._id,
				skillKey,
			});
		}

		console.info(`Enabled ${skillsToEnable.length} skills for user ${doc._id}`);

		return doc; // return unchanged
	},
});

// Migration to backfill action_details with empty history array
export const backfillActionDetailsHistory = migrations.define({
	table: 'action_details',
	migrateOne: async (_ctx, doc) => {
		// Only add history field to soft skill documents
		if (doc.skillKind === 'soft') {
			if (!doc.llm?.history) {
				return {
					...doc,
					llm: {
						...doc.llm,
						history: [],
					},
				};
			}
		}
		return doc; // return unchanged for hard skills or if history already exists
	},
});

// Runner function to execute the migration
export const runEnableMissingSkillsFour = migrations.runner(internal.migrations.enableMissingSkillsFour);
export const runBackfillActionDetailsHistory = migrations.runner(internal.migrations.backfillActionDetailsHistory);

// run through the migration runner after _auditSkillSchemas reports no blocked records.
const skillSchemaBatchSize = 25;
export const _convertSkillSchemas = migrations.define({
	table: 'skills',
	batchSize: skillSchemaBatchSize,
	migrateOne: async (ctx, skill) => {
		await migrateInputSchema(ctx, { skillId: skill._id });
	},
});

// called by the rollout CLI; the component's dry run logs full documents and JSON.stringify fails on bigint.
const skillSchemaRunResult = z.object({ processed: z.number(), isDone: z.boolean(), error: z.string().optional() });
export const _runSkillSchemaMigration = internalMutation({
	args: { dryRun: z.boolean().optional(), reset: z.boolean().optional() },
	returns: skillSchemaRunResult,
	handler: async (ctx, args): Promise<z.infer<typeof skillSchemaRunResult>> => {
		if (args.dryRun) {
			const result = await ctx.db
				.query('skills')
				.withIndex('by_owner_kind')
				.paginate({ cursor: null, numItems: skillSchemaBatchSize });
			for (const skill of result.page) await migrateInputSchema(ctx, { skillId: skill._id });
			// an intentional error rolls back every write; return only aggregate metadata through the error.
			throw new ConvexError({ kind: 'DRY RUN', processed: result.page.length, isDone: result.isDone });
		}
		const result = await migrations.runOne(ctx, internal.migrations._convertSkillSchemas, { reset: args.reset });
		return { processed: result.processed, isDone: result.isDone, error: result.error };
	},
});

// used by scripts/audit-skill-schemas.ts before and after the migration; never writes data.
export const _auditSkillSchemas = internalQuery({
	args: { paginationOpts: paginationOptionsSchema },
	handler: async (ctx, { paginationOpts }) => {
		const result = await ctx.db.query('skills').withIndex('by_owner_kind').paginate(paginationOpts);
		return {
			...result,
			page: result.page.map((skill) => ({
				id: skill._id,
				key: skill.key,
				...inspectSkillSchema(skill.inputSchema),
			})),
		};
	},
});
