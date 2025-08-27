import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api.js';
import { DataModel } from './_generated/dataModel.js';
import { _enableSkill } from './skills/private';

export const migrations = new Migrations<DataModel>(components.migrations);

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

// Runner function to execute the migration
export const runEnableMissingSkillsFour = migrations.runner(internal.migrations.enableMissingSkillsFour);
export const runBackfillActionDetailsHistory = migrations.runner(internal.migrations.backfillActionDetailsHistory);

// export const removeSinceLastSummarizedHistoryMode = migrations.define({
// 	table: 'skills',
// 	migrateOne: async (_ctx, doc) => {
// 		if (doc.kind === 'soft' && doc.config.historyMode === 'since last summarized') {
// 			return {
// 				...doc,
// 				config: {
// 					...doc.config,
// 					historyMode: 'since last instructed' as const,
// 				},
// 			};
// 		}
// 		return doc;
// 	},
// });

// export const removeLastSummarizedAt = migrations.define({
// 	table: 'tasks',
// 	migrateOne: async (_ctx, doc) => {
// 		return { ...doc, lastSummarizedAt: undefined };
// 	},
// });

// export const runRemoveSinceLastSummarizedHistoryMode = migrations.runner(
// 	internal.migrations.removeSinceLastSummarizedHistoryMode,
// );
// export const runRemoveLastSummarizedAt = migrations.runner(internal.migrations.removeLastSummarizedAt);
