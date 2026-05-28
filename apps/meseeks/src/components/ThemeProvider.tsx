import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { createContext, use, useEffect, useState } from 'react';
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

type ThemeSelection = {
	customThemeId: AppThemeId | null;
	previewThemeId: AppThemeId | null;
};

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
	const { isAuthenticated } = useConvexAuth();
	const userTheme = useQuery(api.users.themes.get, isAuthenticated ? {} : 'skip');
	const setThemeMutation = useMutation(api.users.themes.set);
	const resetThemeMutation = useMutation(api.users.themes.reset);

	const [initialCustomThemeId] = useState<AppThemeId | null>(() => getInitialCustomThemeId());
	const [optimisticCustomThemeId, setOptimisticCustomThemeId] = useState<AppThemeId | null | undefined>(undefined);

	// launcher hover previews should not change the persisted selection marker.
	const [previewThemeId, setPreviewThemeId] = useState<AppThemeId | null>(null);
	const [systemThemeMode, setSystemThemeMode] = useState<ThemeMode>(() => getInitialSystemThemeMode());

	const serverCustomThemeId = userTheme === undefined ? undefined : (userTheme.themeId ?? null);
	const loadedCustomThemeId = serverCustomThemeId === undefined ? initialCustomThemeId : serverCustomThemeId;
	const isOptimisticThemeSettled =
		optimisticCustomThemeId !== undefined && optimisticCustomThemeId === serverCustomThemeId;
	const customThemeId =
		isOptimisticThemeSettled || optimisticCustomThemeId === undefined
			? loadedCustomThemeId
			: optimisticCustomThemeId;
	const systemThemeId = getSystemThemeId(systemThemeMode);
	const persistedTheme = resolveTheme({ customThemeId, systemMode: systemThemeMode });
	const displayedTheme = previewThemeId ? getRequiredTheme(previewThemeId) : persistedTheme;
	const displayedThemeSource = previewThemeId || customThemeId ? 'custom' : 'system';

	const syncPersistedCustomTheme = (themeId: AppThemeId | null) => {
		setOptimisticCustomThemeId(themeId);
		syncThemeSnapshot(themeId ? getRequiredTheme(themeId) : null);
	};

	const restoreThemeSelection = (selection: ThemeSelection) => {
		syncPersistedCustomTheme(selection.customThemeId);
		setPreviewThemeId(selection.previewThemeId);
	};

	useEffect(() => {
		// Convex is the source of truth after hydration. The stored snapshot only bridges first paint.
		if (userTheme === undefined) return;

		const themeId = userTheme.themeId ?? null;
		syncThemeSnapshot(themeId ? getRequiredTheme(themeId) : null);
	}, [userTheme]);

	useEffect(() => subscribeToSystemThemeMode(setSystemThemeMode), []);

	useEffect(() => {
		applyThemeToDocument({
			mode: displayedTheme.mode,
			source: displayedThemeSource,
			themeId: displayedTheme.id,
			variables: displayedTheme.variables,
		});
	}, [displayedTheme.id, displayedTheme.mode, displayedTheme.variables, displayedThemeSource]);

	const setThemeById = async (themeId: AppThemeId) => {
		const previousSelection: ThemeSelection = {
			customThemeId,
			previewThemeId,
		};

		syncPersistedCustomTheme(themeId);
		setPreviewThemeId(null);

		try {
			await setThemeMutation({ themeId });
		} catch (error) {
			restoreThemeSelection(previousSelection);
			throw error;
		}
	};

	const resetTheme = async () => {
		const previousSelection: ThemeSelection = {
			customThemeId,
			previewThemeId,
		};

		syncPersistedCustomTheme(null);
		setPreviewThemeId(null);

		try {
			await resetThemeMutation({});
		} catch (error) {
			restoreThemeSelection(previousSelection);
			throw error;
		}
	};

	const previewThemeById = (themeId: AppThemeId) => {
		setPreviewThemeId(themeId);
	};

	const clearThemePreview = () => {
		setPreviewThemeId(null);
	};

	const value = {
		theme: displayedTheme.mode,
		themeId: displayedTheme.id,
		persistedThemeId: customThemeId,
		systemThemeId,
		hasCustomTheme: customThemeId !== null,
		setThemeById,
		resetTheme,
		previewThemeById,
		clearThemePreview,
	};

	return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export function useTheme() {
	//
	const context = use(ThemeProviderContext);
	if (!context) throw new Error('useTheme must be used within a ThemeProvider');

	return context;
}
