import { APP_THEMES } from '~/lib/themes/catalog';

export type LauncherView = 'main' | 'themes';

export type LauncherState = {
	view: LauncherView;
	mainSearch: string;
	themeSearch: string;
};

export type AppTheme = (typeof APP_THEMES)[number];
