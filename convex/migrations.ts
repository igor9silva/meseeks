import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api.js';
import { DataModel } from './_generated/dataModel.js';

export const migrations = new Migrations<DataModel>(components.migrations);

export const removeSinceLastSummarizedHistoryMode = migrations.define({
	table: 'skills',
	migrateOne: async (_ctx, doc) => {
		if (doc.kind === 'soft' && doc.config.historyMode === 'since last summarized') {
			return {
				...doc,
				config: {
					...doc.config,
					historyMode: 'since last instructed' as const,
				},
			};
		}
		return doc;
	},
});

export const removeLastSummarizedAt = migrations.define({
	table: 'tasks',
	migrateOne: async (_ctx, doc) => {
		return { ...doc, lastSummarizedAt: undefined };
	},
});

export const runRemoveSinceLastSummarizedHistoryMode = migrations.runner(
	internal.migrations.removeSinceLastSummarizedHistoryMode,
);
export const runRemoveLastSummarizedAt = migrations.runner(internal.migrations.removeLastSummarizedAt);
