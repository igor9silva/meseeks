import { APP_THEMES } from '~/lib/themes/catalog';
import type { FileView } from '~/hooks/query/useFile';

export type LauncherView = 'main' | 'themes';

export type LauncherState = {
	view: LauncherView;
	mainSearch: string;
	themeSearch: string;
};

export type CurrentFile = FileView;
export type LauncherFile = Pick<FileView, '_id' | 'isActive' | 'name'>;
export type AppTheme = (typeof APP_THEMES)[number];
