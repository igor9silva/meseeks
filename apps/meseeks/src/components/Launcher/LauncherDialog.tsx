import { useLocation, useNavigate } from '@tanstack/react-router';
import { defaultFilter } from '@reactor/ui/command';
import { usePaginatedQuery, useQuery } from 'convex/react';
import {
	startTransition,
	type KeyboardEvent,
	type UIEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { api } from 'convex/_generated/api';
import { useTheme } from '~/components/ThemeProvider';
import { DialogDescription, DialogTitle } from '@reactor/ui/dialog';
import { CommandDialog, CommandInput, CommandList } from '@reactor/ui/command';
import { useFeedbackDialog } from '~/hooks/useFeedbackDialog';
import { useKeyboardShortcut } from '@reactor/ui/hooks/useKeyboardShortcuts';
import { useCurrentFileId } from '~/hooks/useCurrentFile';
import { LauncherContent } from './LauncherContent';
import { useLauncher } from './LauncherProvider';
import { THEME_PICKER_SEARCH } from './themeSearch';
import type { LauncherState } from './types';
import { ThemePickerView } from './themes/ThemePickerView';

const PAGE_SIZE = 20;
const SCROLL_THRESHOLD = 200;

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
	const openFeedbackDialogRef = useRef(feedbackDialog.open);

	useEffect(() => {
		openFeedbackDialogRef.current = feedbackDialog.open;
	}, [feedbackDialog.open]);

	// new file shortcut (⌘+J)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'j' },
		callback: () => {
			// use startTransition to mark navigation as non-urgent
			startTransition(() => {
				navigate({ to: '/$', params: { _splat: 'new' } });
			});
		},
	});

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

	const shouldFilter = useMemo(() => {
		//
		if (view === 'themes') return false;

		return mainSearch !== defaultSearch;
		//
	}, [defaultSearch, mainSearch, view]);

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
			//
			setSearch(nextSearch);
		},
		[setSearch],
	);

	const handleInputKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			//
			if (view !== 'main') return;
			if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		},
		[view],
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

	const {
		results: files,
		status: paginationStatus,
		loadMore,
	} = usePaginatedQuery(
		api.files.findAllPaginated,
		{ paginationOpts: { numItems: PAGE_SIZE, cursor: null } },
		{ initialNumItems: PAGE_SIZE },
	);
	const currentFileId = useCurrentFileId();
	const hasMore = paginationStatus === 'CanLoadMore';
	const isLoadingMore = paginationStatus === 'LoadingMore';

	const handleScroll = useCallback(
		(e: UIEvent<HTMLDivElement>) => {
			//
			const target = e.currentTarget;
			const { scrollTop, scrollHeight, clientHeight } = target;
			const scrollBottom = scrollHeight - scrollTop - clientHeight;

			if (scrollBottom < SCROLL_THRESHOLD && hasMore && !isLoadingMore) {
				loadMore(PAGE_SIZE);
			}
		},
		[hasMore, isLoadingMore, loadMore],
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
				const result = defaultFilter?.(value, searchValue, keywords) ?? 0;
				if (value === '/seek') return result + 0.0000001;
				return result;
			}}
		>
			<DialogTitle className="hidden">Launcher</DialogTitle>
			<DialogDescription className="hidden">Search for tasks, notes, files, and more.</DialogDescription>
			<CommandInput
				placeholder="Act or search..."
				value={search}
				onKeyDown={handleInputKeyDown}
				onValueChange={handleSearchChange}
			/>
			<CommandList className="max-h-[80svh]" onScroll={handleScroll}>
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
						currentFileId={currentFileId}
						isLoadingMore={isLoadingMore}
						onClose={close}
						onFeedback={handleFeedback}
						onNavigate={onSelect}
						onOpenThemePicker={openThemePicker}
						shouldUseSearch={shouldFilter}
						files={files}
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
