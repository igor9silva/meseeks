import { Migrations, runToCompletion } from '@convex-dev/migrations';
import { z } from 'zod';
import { internalAction, internalQuery } from 'lib/convex';
import { components, internal } from './_generated/api.js';
import { DataModel } from './_generated/dataModel.js';
import { auditInputSchemas, enableSkill, removeInputSchemaBackup } from './skills.private';

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

export const _removeSkillSchemaBackups = migrations.define({
	table: 'skills',
	batchSize: 25,
	customRange: (query) => query.withIndex('by_owner_kind'),
	migrateOne: (ctx, skill) => removeInputSchemaBackup(ctx, { skillId: skill._id }),
});

// called by the deploy runner to validate all live schemas before and after the migration.
export const _auditSkillSchemaBackups = internalQuery({
	args: auditInputSchemas.args,
	returns: z.object({
		isDone: z.boolean(),
		continueCursor: z.string(),
		scanned: z.number(),
		backups: z.number(),
	}),
	handler: auditInputSchemas,
});

// the pipeline awaits the component's runner, so deployment success means the migration finished.
export const _runSkillSchemaBackupMigration = internalAction({
	args: {},
	returns: z.null(),
	handler: async (ctx): Promise<null> => {
		//
		const audit = async () => {
			// this loop only reads; migration cursors and writes belong to the migrations component.
			let cursor: string | null = null;
			let scanned = 0;
			let backups = 0;
			for (;;) {
				// pin the API result to its helper to break the generated function-reference type cycle.
				const page: Awaited<ReturnType<typeof auditInputSchemas>> = await ctx.runQuery(
					internal.migrations._auditSkillSchemaBackups,
					{ cursor },
				);
				scanned += page.scanned;
				backups += page.backups;
				if (page.isDone) return { scanned, backups };
				cursor = page.continueCursor;
			}
		};

		console.info('Skill schema backup audit', await audit());
		const status = await runToCompletion(ctx, components.migrations, internal.migrations._removeSkillSchemaBackups);
		const verification = await audit();
		if (verification.backups !== 0) throw new Error('Skill schema backups remain after migration');
		console.info('Skill schema backup migration complete', {
			state: status.state,
			processed: status.processed,
			remaining: verification.backups,
		});
		return null;
	},
});
