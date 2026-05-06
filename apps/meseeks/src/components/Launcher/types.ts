import type { Doc } from 'convex/_generated/dataModel';
import { APP_THEMES } from '~/lib/themes/catalog';

export type LauncherView = 'main' | 'themes';

export type LauncherState = {
	view: LauncherView;
	mainSearch: string;
	themeSearch: string;
};

export type CurrentTask = Doc<'tasks'>;
export type LauncherTask = Pick<Doc<'tasks'>, '_id' | 'isActive' | 'title'>;
export type AppTheme = (typeof APP_THEMES)[number];
