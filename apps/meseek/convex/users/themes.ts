import { mutation, query } from 'lib/convex';
import { appThemeIdSchema, type AppThemeId } from '../../src/lib/themes/catalog';
import { parseStoredThemeId } from '../../src/lib/themes/resolve';
import { getCurrentUser } from '../users.private';
import { clearUserPreference, findUserPreference, setUserPreference } from './preferences.private';

const themePreferenceKey = 'themeId';

const themeIconNameById = {
	'default-dark': 'moon-star',
	'default-light': 'sun-medium',
	'pastel-de-nata': 'cake-slice',
	'graphite-ledger': 'book-open-text',
	'ink-well': 'pen-tool',
	'moss-study': 'leaf',
	'oxblood-club': 'wine',
	'fjord-dusk': 'mountain',
	'limestone': 'landmark',
	'paper-and-ink': 'newspaper',
	'sage-receipt': 'receipt',
	'terracotta-desk': 'pencil-ruler',
	'harbor-mist': 'cloud',
} as const satisfies Record<AppThemeId, string>;

export const get = query({
	args: {},
	handler: async (ctx) => {
		//
		const user = await getCurrentUser(ctx, {});
		const themePreference = await findUserPreference(ctx, {
			userId: user._id,
			key: themePreferenceKey,
		});

		return {
			themeId: parseStoredThemeId(themePreference?.value),
			themeIconNameById,
		};
	},
});

export const set = mutation({
	args: {
		themeId: appThemeIdSchema,
	},
	handler: async (ctx, { themeId }) => {
		//
		const user = await getCurrentUser(ctx, {});
		await setUserPreference(ctx, {
			userId: user._id,
			key: themePreferenceKey,
			value: themeId,
		});

		return { themeId };
	},
});

export const reset = mutation({
	args: {},
	handler: async (ctx) => {
		//
		const user = await getCurrentUser(ctx, {});

		await clearUserPreference(ctx, {
			userId: user._id,
			key: themePreferenceKey,
		});

		return { themeId: null };
	},
});
