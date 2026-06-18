import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
	applyThemeToDocument,
	getInitialCustomThemeId,
	getInitialSystemThemeMode,
	subscribeToSystemThemeMode,
} from '~/lib/themes/document';
import { getRequiredTheme, getSystemThemeId, resolveTheme } from '~/lib/themes/resolve';
import { syncThemeSnapshot } from '~/lib/themes/storage';
import type { AppThemeId, ThemeMode } from '~/lib/themes/catalog';

// TODO:personalization: vision
// - persist config to server, load during SSR toghether with user data
// - mode = dark, light or system (auto, tied with OS)
// - theme = customizable everything (from corner radius to spacing)

type ThemeProviderContextType = {
	theme: ThemeMode;
	themeId: AppThemeId;
	persistedThemeId: AppThemeId | null;
	systemThemeId: AppThemeId;
	hasCustomTheme: boolean;
	setThemeById: (themeId: AppThemeId) => Promise<void>;
	resetTheme: () => Promise<void>;
	previewThemeById: (themeId: AppThemeId) => void;
	clearThemePreview: () => void;
};

const ThemeProviderContext = createContext<ThemeProviderContextType | null>(null);

type ThemeProviderProps = {
	children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
	//
	const [customThemeId, setCustomThemeId] = useState<AppThemeId | null>(() => getInitialCustomThemeId());

	// launcher hover previews should not change the persisted selection marker.
	const [previewThemeId, setPreviewThemeId] = useState<AppThemeId | null>(null);
	const [systemThemeMode, setSystemThemeMode] = useState<ThemeMode>(() => getInitialSystemThemeMode());

	const systemThemeId = getSystemThemeId(systemThemeMode);
	const persistedTheme = resolveTheme({ customThemeId, systemMode: systemThemeMode });
	const displayedTheme = previewThemeId ? getRequiredTheme(previewThemeId) : persistedTheme;
	const displayedThemeSource = previewThemeId || customThemeId ? 'custom' : 'system';

	const syncPersistedCustomTheme = useCallback((themeId: AppThemeId | null) => {
		setCustomThemeId(themeId);
		syncThemeSnapshot(themeId ? getRequiredTheme(themeId) : null);
	}, []);

	useEffect(() => subscribeToSystemThemeMode(setSystemThemeMode), []);

	useEffect(() => {
		applyThemeToDocument({
			mode: displayedTheme.mode,
			source: displayedThemeSource,
			themeId: displayedTheme.id,
			variables: displayedTheme.variables,
		});
	}, [displayedTheme.id, displayedTheme.mode, displayedTheme.variables, displayedThemeSource]);

	const setThemeById = useCallback(
		async (themeId: AppThemeId) => {
			syncPersistedCustomTheme(themeId);
			setPreviewThemeId(null);
		},
		[syncPersistedCustomTheme],
	);

	const resetTheme = useCallback(async () => {
		syncPersistedCustomTheme(null);
		setPreviewThemeId(null);
	}, [syncPersistedCustomTheme]);

	const previewThemeById = useCallback((themeId: AppThemeId) => {
		setPreviewThemeId(themeId);
	}, []);

	const clearThemePreview = useCallback(() => {
		setPreviewThemeId(null);
	}, []);

	const value = useMemo(
		() => ({
			theme: displayedTheme.mode,
			themeId: displayedTheme.id,
			persistedThemeId: customThemeId,
			systemThemeId,
			hasCustomTheme: customThemeId !== null,
			setThemeById,
			resetTheme,
			previewThemeById,
			clearThemePreview,
		}),
		[
			clearThemePreview,
			customThemeId,
			displayedTheme.id,
			displayedTheme.mode,
			previewThemeById,
			resetTheme,
			setThemeById,
			systemThemeId,
		],
	);

	return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export function useTheme() {
	//
	const context = useContext(ThemeProviderContext);
	if (!context) throw new Error('useTheme must be used within a ThemeProvider');

	return context;
}
