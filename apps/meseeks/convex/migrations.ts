import { Migrations } from '@convex-dev/migrations';
import { ConvexError } from 'convex/values';
import { z } from 'zod';
import { components, internal } from './_generated/api.js';
import { DataModel } from './_generated/dataModel.js';
import { enableSkill, migrateInputSchema } from './skills.private';
import { internalMutation, internalQuery } from 'lib/convex';
import { paginationOptionsSchema } from 'schemas/paginationOptionsSchema';
import { inspectSkillSchema } from 'lib/skillSchemaMigration';

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
