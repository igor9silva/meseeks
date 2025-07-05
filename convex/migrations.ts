import { Migrations } from '@convex-dev/migrations';
import { components, internal } from './_generated/api.js';
import { DataModel } from './_generated/dataModel.js';

export const migrations = new Migrations<DataModel>(components.migrations);

// export const fillDepth = migrations.define({
// 	table: 'actions',
// 	// customRange: (query) => query.withIndex('by_requiredField', (q) => q.eq('requiredField', '')),
// 	migrateOne: async (_ctx, doc) => ({ depth: 0 }),
// });

// export const fillEnergyBudget = migrations.define({
// 	table: 'tasks',
// 	migrateOne: async (_ctx, doc) => {
// 		// Check if the task has the old budgetUSDC field
// 		if ('budgetUSDC' in doc && doc.budgetUSDC) {
// 			return {
// 				energyBudget: doc.budgetUSDC,
// 				// budgetUSDC: undefined, // Remove the old field
// 			};
// 		}
// 		// If it already has budgetEnergy or no budget field, no change needed
// 		return {};
// 	},
// });

export const removeBudgetUSDC = migrations.define({
	table: 'tasks',
	migrateOne: async (_ctx, doc) => {
		return { budgetUSDC: undefined };
	},
});

// export const runFillDepth = migrations.runner(internal.migrations.fillDepth);
// export const runFillEnergyBudget = migrations.runner(internal.migrations.fillEnergyBudget);
export const runRemoveBudgetUSDC = migrations.runner(internal.migrations.removeBudgetUSDC);
