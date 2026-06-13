import { useLocation, useNavigate } from '@tanstack/react-router';
import { defaultFilter } from '@reactor/ui/command';
import { useQuery } from 'convex/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from 'convex/_generated/api';
import { useTheme } from '~/components/ThemeProvider';
import { DialogDescription, DialogTitle } from '@reactor/ui/dialog';
import { CommandDialog, CommandInput, CommandList } from '@reactor/ui/command';
import { useFeedbackDialog } from '~/hooks/useFeedbackDialog';
import { LauncherContent } from './LauncherContent';
import { useLauncher } from './LauncherProvider';
import { THEME_PICKER_SEARCH } from './themeSearch';
import type { LauncherState } from './types';
import { ThemePickerView } from './themes/ThemePickerView';

export function LauncherDialog() {
	//
	const { isOpen, close } = useLauncher();
	const {
		clearThemePreview,
		hasCustomTheme,
		persistedThemeId,
		previewThemeById,
		resetTheme,
		setThemeById,
		systemThemeId,
	} = useTheme();

	const themePreferences = useQuery(api.users.themes.get, {});
	const themeIconNameById = themePreferences?.themeIconNameById ?? {};

	const { pathname, searchStr } = useLocation();
	const navigate = useNavigate();
	const defaultSearch = getDefaultLauncherSearch({ pathname, searchStr });

	const feedbackDialog = useFeedbackDialog();
	const [launcherState, setLauncherState] = useState<LauncherState>(() => ({
		view: 'main',
		mainSearch: defaultSearch,
		themeSearch: THEME_PICKER_SEARCH,
	}));

	const { mainSearch, themeSearch, view } = launcherState;
	const previousDefaultSearchRef = useRef(defaultSearch);
	const search = view === 'themes' ? themeSearch : mainSearch;
	const shouldFilter = view !== 'themes' && mainSearch !== defaultSearch;
	const openFeedbackDialogRef = useRef(feedbackDialog.open);

	useEffect(() => {
		openFeedbackDialogRef.current = feedbackDialog.open;
	}, [feedbackDialog.open]);

	useEffect(() => {
		//
		const previousDefaultSearch = previousDefaultSearchRef.current;

		setLauncherState((state) => {
			//
			if (state.mainSearch !== previousDefaultSearch) return state;
			if (state.mainSearch === defaultSearch) return state;

			return { ...state, mainSearch: defaultSearch };
		});

		previousDefaultSearchRef.current = defaultSearch;
		//
	}, [defaultSearch]);

	const setSearch = useCallback((nextSearch: string) => {
		setLauncherState((state) => {
			//
			if (state.view === 'themes') {
				return { ...state, themeSearch: nextSearch };
			}

			return { ...state, mainSearch: nextSearch };
		});
	}, []);

	const handleSearchChange = useCallback(
		(nextSearch: string) => {
			setSearch(nextSearch);
		},
		[setSearch],
	);

	const showMainLauncherView = useCallback(() => {
		clearThemePreview();
		setLauncherState((state) => ({ ...state, view: 'main' }));
	}, [clearThemePreview]);

	const openThemePicker = useCallback(() => {
		setLauncherState((state) => ({
			...state,
			view: 'themes',
			themeSearch: THEME_PICKER_SEARCH,
		}));
	}, []);

	const onSelect = useCallback(
		(value: string) => {
			close();
			navigate({ to: value });
		},
		[navigate, close],
	);

	const handleFeedback = useCallback(() => {
		close();
		openFeedbackDialogRef.current();
	}, [close]);

	const closeAndResetLauncher = useCallback(() => {
		clearThemePreview();
		setLauncherState({
			view: 'main',
			mainSearch: defaultSearch,
			themeSearch: THEME_PICKER_SEARCH,
		});
		close();
	}, [clearThemePreview, close, defaultSearch]);

	const handleEscapeKeyDown = useCallback(
		(event: Event) => {
			if (view !== 'themes') return;

			event.preventDefault();
			showMainLauncherView();
		},
		[showMainLauncherView, view],
	);

	return (
		<CommandDialog
			shouldFilter={shouldFilter}
			open={isOpen}
			showCloseButton={false}
			onEscapeKeyDown={handleEscapeKeyDown}
			onOpenChange={(open) => {
				if (!open) closeAndResetLauncher();
			}}
			filter={(value, searchValue, keywords) => {
				//
				return defaultFilter?.(value, searchValue, keywords) ?? 0;
			}}
		>
			<DialogTitle className="hidden">Launcher</DialogTitle>
			<DialogDescription className="hidden">Search workspaces, files, and actions.</DialogDescription>
			<CommandInput placeholder="Act or search..." value={search} onValueChange={handleSearchChange} />
			<CommandList className="max-h-[80svh]">
				{view === 'themes' ? (
					<ThemePickerView
						hasCustomTheme={hasCustomTheme}
						persistedThemeId={persistedThemeId}
						onBack={showMainLauncherView}
						onClearPreview={clearThemePreview}
						onPreviewTheme={previewThemeById}
						onCommitTheme={async (themeId) => {
							await setThemeById(themeId);
							closeAndResetLauncher();
						}}
						onResetTheme={async () => {
							await resetTheme();
							closeAndResetLauncher();
						}}
						systemThemeId={systemThemeId}
						themeIconNameById={themeIconNameById}
						themeSearch={themeSearch}
					/>
				) : (
					<LauncherContent
						onClose={close}
						onFeedback={handleFeedback}
						onNavigate={onSelect}
						onOpenThemePicker={openThemePicker}
					/>
				)}
			</CommandList>
		</CommandDialog>
	);
}

function getDefaultLauncherSearch({ pathname, searchStr }: { pathname: string; searchStr: string }) {
	//
	if (pathname === '/' && !searchStr) return '';

	return pathname + searchStr;
}
