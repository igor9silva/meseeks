import {
	BASE_THEME_VARIABLES,
	DEFAULT_LIGHT_THEME_ID,
	DEFAULT_THEME_ID,
	APP_THEMES,
	type AppThemeId,
	type ThemeMode,
	type ThemeVariables,
} from './catalog';
import { getRequiredTheme, parseStoredThemeId, parseThemeSource, type ThemeSource } from './resolve';
import { getStoredThemeSnapshot, THEME_STORAGE_KEY } from './storage';

export const defaultDarkThemeColor = toHslColor(getRequiredTheme(DEFAULT_THEME_ID).variables['--background']);
export const defaultLightThemeColor = toHslColor(getRequiredTheme(DEFAULT_LIGHT_THEME_ID).variables['--background']);
export const ACTIVE_THEME_STYLE_ID = 'meseeks-active-theme';

export const baseThemeCssText = [
	serializeCssBlock(':root', {
		'color-scheme': 'light',
		...BASE_THEME_VARIABLES,
		...getRequiredTheme(DEFAULT_LIGHT_THEME_ID).variables,
	}),
	serializeMediaQueryBlock(
		'(prefers-color-scheme: dark)',
		serializeCssBlock(":root:not([data-theme-source='custom'])", {
			'color-scheme': 'dark',
			...getRequiredTheme(DEFAULT_THEME_ID).variables,
		}),
	),
].join('\n\n');

// this has to stay dependency-free because it runs before the app bundle loads.
export function getThemeInitScript() {
	//
	return `
(() => {
	const themeStorageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
	const activeThemeStyleId = ${JSON.stringify(ACTIVE_THEME_STYLE_ID)};
	// reject deleted theme ids here so a stale client snapshot cannot win the first paint.
	const validThemeIds = new Set(${JSON.stringify(APP_THEMES.map((theme) => theme.id))});
	const systemMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	const systemThemeId = systemMode === 'dark' ? ${JSON.stringify(DEFAULT_THEME_ID)} : ${JSON.stringify(DEFAULT_LIGHT_THEME_ID)};
	const storedTheme = readStoredThemeSnapshot();
	const themeId = storedTheme?.id ?? systemThemeId;
	const mode = storedTheme?.mode ?? systemMode;
	const root = document.documentElement;

	syncActiveThemeStyle(storedTheme ?? null);
	root.dataset.theme = themeId;
	root.dataset.themeSource = storedTheme ? 'custom' : 'system';
	root.classList.remove('light', 'dark');
	root.classList.add(mode);

	function readStoredThemeSnapshot() {
		try {
			const value = localStorage.getItem(themeStorageKey);
			if (!value) return null;

			const theme = JSON.parse(value);
			if (!theme || typeof theme !== 'object') return null;
			if (typeof theme.id !== 'string') return null;
			if (!validThemeIds.has(theme.id)) {
				localStorage.removeItem(themeStorageKey);
				return null;
			}
			if (theme.mode !== 'dark' && theme.mode !== 'light') return null;
			if (!isThemeVariables(theme.variables)) return null;

			return theme;
		} catch {
			return null;
		}
	}

	function isThemeVariables(value) {
		if (!value || typeof value !== 'object') return false;

		return Object.entries(value).every(([name, cssValue]) => {
			return isSafeCssVariableName(name) && isSafeCssVariableValue(cssValue);
		});
	}

	function isSafeCssVariableName(name) {
		return /^--[a-z0-9-]+$/.test(name);
	}

	function isSafeCssVariableValue(value) {
		return typeof value === 'string' && !/[;{}]/.test(value);
	}

	function syncActiveThemeStyle(theme) {
		const existingStyle = document.getElementById(activeThemeStyleId);
		if (!theme) {
			existingStyle?.remove();
			return;
		}

		const style = existingStyle ?? document.createElement('style');
		style.id = activeThemeStyleId;
		style.textContent = serializeCssVariables(theme);

		if (!existingStyle) document.head.appendChild(style);
	}

	function serializeCssVariables(theme) {
		const declarations = Object.entries({
			'color-scheme': theme.mode,
			...theme.variables,
		})
			.map(([name, value]) => '\\t' + name + ': ' + value + ';')
			.join('\\n');

		return ':root {\\n' + declarations + '\\n}';
	}
})();
	`.trim();
}

export function applyThemeToDocument(input: {
	themeId: AppThemeId;
	mode: ThemeMode;
	source: ThemeSource;
	variables: ThemeVariables;
}) {
	//
	if (typeof document === 'undefined') return;

	const root = document.documentElement;
	syncActiveThemeStyle(input.source === 'custom' ? input : null);
	root.dataset.theme = input.themeId;
	root.dataset.themeSource = input.source;
	root.classList.remove('light', 'dark');
	root.classList.add(input.mode);
}

export function getDocumentThemeSnapshot() {
	//
	if (typeof document === 'undefined') {
		return {
			mode: undefined,
			themeId: null,
			themeSource: undefined,
		};
	}

	const themeId = parseStoredThemeId(document.documentElement.dataset.theme);
	const theme = themeId ? getRequiredTheme(themeId) : undefined;

	return {
		mode: theme?.mode,
		themeId,
		themeSource: parseThemeSource(document.documentElement.dataset.themeSource),
	};
}

export function getThemeModeFromSystemPreference() {
	//
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getInitialCustomThemeId() {
	//
	const documentThemeSnapshot = getDocumentThemeSnapshot();
	if (documentThemeSnapshot.themeSource === 'custom') return documentThemeSnapshot.themeId;

	return getStoredThemeSnapshot()?.id ?? null;
}

export function getInitialSystemThemeMode(): ThemeMode {
	//
	const documentThemeSnapshot = getDocumentThemeSnapshot();
	if (documentThemeSnapshot.themeSource === 'system' && documentThemeSnapshot.mode) return documentThemeSnapshot.mode;

	if (typeof document === 'undefined') return 'light';
	if (document.documentElement.classList.contains('dark')) return 'dark';
	if (document.documentElement.classList.contains('light')) return 'light';
	return getThemeModeFromSystemPreference();
}

export function subscribeToSystemThemeMode(onChange: (mode: ThemeMode) => void) {
	//
	if (typeof window === 'undefined') return () => undefined;

	const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
	const handleSystemThemeChange = () => onChange(getThemeModeFromSystemPreference());

	handleSystemThemeChange();
	mediaQueryList.addEventListener('change', handleSystemThemeChange);

	return () => mediaQueryList.removeEventListener('change', handleSystemThemeChange);
}

export function getRootDocumentTheme() {
	//
	// On the server this returns the neutral shell. On the client it reads the <html>
	// attrs that the prepaint script already set, so hydration sees the same theme.
	const documentThemeSnapshot = getDocumentThemeSnapshot();

	return {
		htmlClassName: documentThemeSnapshot.mode ? `overflow-hidden ${documentThemeSnapshot.mode}` : 'overflow-hidden',
		themeId: documentThemeSnapshot.themeId ?? undefined,
		themeSource: documentThemeSnapshot.themeSource,
	};
}

function toHslColor(value: string) {
	//
	return `hsl(${value})`;
}

function serializeCssBlock(selector: string, variables: Record<string, string>) {
	//
	const declarations = Object.entries(variables)
		.map(([name, value]) => `\t${name}: ${value};`)
		.join('\n');

	return `${selector} {\n${declarations}\n}`;
}

function serializeMediaQueryBlock(query: string, block: string) {
	//
	const indentedBlock = block
		.split('\n')
		.map((line) => `\t${line}`)
		.join('\n');

	return `@media ${query} {\n${indentedBlock}\n}`;
}

function syncActiveThemeStyle(theme: { mode: ThemeMode; variables: ThemeVariables } | null) {
	//
	const existingStyle = document.getElementById(ACTIVE_THEME_STYLE_ID);
	if (!theme) {
		existingStyle?.remove();
		return;
	}

	const style = existingStyle ?? document.createElement('style');
	style.id = ACTIVE_THEME_STYLE_ID;
	style.textContent = serializeCssBlock(':root', {
		'color-scheme': theme.mode,
		...theme.variables,
	});

	if (!existingStyle) document.head.appendChild(style);
}
