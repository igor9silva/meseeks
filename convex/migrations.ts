import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api.js';
import { DataModel } from './_generated/dataModel.js';
import { _enableSkill } from './skills/private';

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
			await _enableSkill(ctx, {
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

// Migration to rename toolCalls.args → toolCalls.input
export const migrateToolCallsArgsToInput = migrations.define({
	table: 'action_details',
	batchSize: 25,
	migrateOne: async (_ctx, doc) => {
		//
		if (doc.skillKind !== 'soft') return doc;

		const llm = doc.llm;

		// check if any toolCalls have args but not input
		if (!llm.toolCalls?.some((call) => 'args' in call && !('input' in call))) {
			return doc;
		}

		// convert args → input
		const updatedToolCalls = llm.toolCalls.map((call) => {
			if ('args' in call && !('input' in call)) {
				const { args, ...rest } = call;
				return { ...rest, input: args };
			}
			return call;
		});

		return {
			...doc,
			llm: { ...llm, toolCalls: updatedToolCalls },
		};
	},
});

// Runner function to execute the migration
export const runEnableMissingSkillsFour = migrations.runner(internal.migrations.enableMissingSkillsFour);
export const runBackfillActionDetailsHistory = migrations.runner(internal.migrations.backfillActionDetailsHistory);
export const runMigrateToolCallsArgsToInput = migrations.runner(internal.migrations.migrateToolCallsArgsToInput);
