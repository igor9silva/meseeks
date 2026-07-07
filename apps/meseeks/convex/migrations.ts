import { Migrations } from '@convex-dev/migrations';
import { components } from './_generated/api.js';
import type { DataModel } from './_generated/dataModel.js';

export const migrations = new Migrations<DataModel>(components.migrations);

/*
pre-existing migration reference:

import { internal } from './_generated/api.js';
import { enableSkill } from './skills.private';

export const enableMissingSkillsFour = migrations.define({
	table: 'users',
	migrateOne: async (ctx, doc) => {
		const skillsToEnable = ['transcribeYouTube', 'describeYouTube', 'compose'];

		for (const skillKey of skillsToEnable) {
			await enableSkill(ctx, {
				userId: doc._id,
				skillKey,
			});
		}

		console.info(`Enabled ${skillsToEnable.length} skills for user ${doc._id}`);

		return doc;
	},
});

export const runEnableMissingSkillsFour = migrations.runner(internal.migrations.enableMissingSkillsFour);
*/

/*
pre-existing migration reference:

import { internal } from './_generated/api.js';

export const backfillActionDetailsHistory = migrations.define({
	table: 'action_details',
	migrateOne: async (_ctx, doc) => {
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

		return doc;
	},
});

export const runBackfillActionDetailsHistory = migrations.runner(internal.migrations.backfillActionDetailsHistory);
*/
