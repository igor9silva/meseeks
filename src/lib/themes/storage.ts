import { appThemeSchema, type AppTheme } from './catalog';

export const THEME_STORAGE_KEY = 'meseeks-theme';

const storedThemeSnapshotSchema = appThemeSchema.pick({
	id: true,
	mode: true,
	variables: true,
});

export type StoredThemeSnapshot = Pick<AppTheme, 'id' | 'mode' | 'variables'>;

export function getStoredThemeSnapshot() {
	//
	if (typeof localStorage === 'undefined') return null;

	const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
	if (!storedTheme) return null;

	const parsedJson = safeParseJson(storedTheme);
	const parsedTheme = storedThemeSnapshotSchema.safeParse(parsedJson);
	if (parsedTheme.success) return parsedTheme.data;

	// clear stale or invalid snapshots so removed theme ids do not linger forever.
	clearThemeSnapshot();
	return null;
}

// keep only the active theme snapshot client-side so first paint does not need
// CSS for every possible theme.
export function writeThemeSnapshot(theme: StoredThemeSnapshot) {
	//
	if (typeof localStorage === 'undefined') return;

	localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
}

export function clearThemeSnapshot() {
	//
	if (typeof localStorage === 'undefined') return;

	localStorage.removeItem(THEME_STORAGE_KEY);
}

export function syncThemeSnapshot(theme: StoredThemeSnapshot | null) {
	//
	if (theme) {
		writeThemeSnapshot(theme);
		return;
	}

	clearThemeSnapshot();
}

function safeParseJson(value: string) {
	//
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return null;
	}
}
