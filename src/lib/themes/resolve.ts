import { z } from 'zod/v3';
import {
	APP_THEMES,
	DEFAULT_LIGHT_THEME_ID,
	DEFAULT_THEME_ID,
	appThemeIdSchema,
	type AppThemeId,
	type ThemeMode,
} from './catalog';

export const themeSourceSchema = z.enum(['custom', 'system']);
export type ThemeSource = z.infer<typeof themeSourceSchema>;

export function isThemeId(value: unknown): value is AppThemeId {
	//
	return appThemeIdSchema.safeParse(value).success;
}

export function parseStoredThemeId(value: unknown): AppThemeId | null {
	//
	const parsedThemeId = appThemeIdSchema.safeParse(value);
	return parsedThemeId.success ? parsedThemeId.data : null;
}

export function parseThemeSource(value: unknown) {
	//
	const parsedThemeSource = themeSourceSchema.safeParse(value);
	return parsedThemeSource.success ? parsedThemeSource.data : undefined;
}

export function getThemeById(themeId: string | null | undefined) {
	//
	if (!themeId) return undefined;
	return APP_THEMES.find((theme) => theme.id === themeId);
}

export function getRequiredTheme(themeId: AppThemeId) {
	//
	const theme = getThemeById(themeId);
	if (theme) return theme;

	throw new Error(`Theme not found: ${themeId}`);
}

export function getSystemThemeId(systemMode: ThemeMode): AppThemeId {
	//
	return systemMode === 'dark' ? DEFAULT_THEME_ID : DEFAULT_LIGHT_THEME_ID;
}

export function resolveTheme(input: { customThemeId: AppThemeId | null; systemMode: ThemeMode }) {
	//
	const themeId = input.customThemeId ?? getSystemThemeId(input.systemMode);
	return getRequiredTheme(themeId);
}
