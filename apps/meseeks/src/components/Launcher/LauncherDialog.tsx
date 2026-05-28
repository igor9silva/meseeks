import { useLocation, useNavigate } from '@tanstack/react-router';
import { defaultFilter } from '@reactor/ui/command-state';
import { usePaginatedQuery, useQuery } from 'convex/react';
import { Suspense, startTransition, KeyboardEvent, UIEvent, useEffect, useRef, useState } from 'react';
import { api } from 'convex/_generated/api';
import { Loading } from '~/components/Loading';
import TaskDetail from '~/components/TaskDetail';
import { useTheme } from '~/components/ThemeProvider';
import { DialogDescription, DialogTitle } from '@reactor/ui/dialog';
import { CommandDialog, CommandInput, CommandList } from '@reactor/ui/command';
import { useFeedbackDialog } from '~/hooks/useFeedbackDialog';
import { useKeyboardShortcut } from '@reactor/ui/hooks/useKeyboardShortcuts';
import { useSplatParams } from '~/hooks/useSplatParams';
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
	const [hasRequestedMobileList, setHasRequestedMobileList] = useState(false);
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

	// new task shortcut (⌘+J)
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

	const shouldFilter = (() => {
		//
		if (view === 'themes') return false;

		return mainSearch !== defaultSearch;
		//
	})();

	const setSearch = (nextSearch: string) => {
		setLauncherState((state) => {
			//
			if (state.view === 'themes') {
				return { ...state, themeSearch: nextSearch };
			}

			return { ...state, mainSearch: nextSearch };
		});
	};

	const handleSearchChange = (nextSearch: string) => {
		//
		if (view === 'main' && nextSearch !== defaultSearch) {
			setHasRequestedMobileList(true);
		}

		setSearch(nextSearch);
	};

	const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		//
		if (view !== 'main') return;
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

		setHasRequestedMobileList(true);
	};

	const showMainLauncherView = () => {
		clearThemePreview();
		setLauncherState((state) => ({ ...state, view: 'main' }));
	};

	const openThemePicker = () => {
		setLauncherState((state) => ({
			...state,
			view: 'themes',
			themeSearch: THEME_PICKER_SEARCH,
		}));
	};

	const onSelect = (value: string) => {
		close();
		navigate({ to: value });
	};

	const handleFeedback = () => {
		close();
		openFeedbackDialogRef.current();
	};

	const closeAndResetLauncher = () => {
		clearThemePreview();
		setHasRequestedMobileList(false);
		setLauncherState({
			view: 'main',
			mainSearch: defaultSearch,
			themeSearch: THEME_PICKER_SEARCH,
		});
		close();
	};

	const handleEscapeKeyDown = (event: Event) => {
		if (view !== 'themes') return;

		event.preventDefault();
		showMainLauncherView();
	};

	const {
		results: tasks,
		status: paginationStatus,
		loadMore,
	} = usePaginatedQuery(
		api.tasks.findAllPaginated,
		{ paginationOpts: { numItems: PAGE_SIZE, cursor: null } },
		{ initialNumItems: PAGE_SIZE },
	);
	const { taskId: currentTaskId } = useSplatParams();
	const hasMore = paginationStatus === 'CanLoadMore';
	const isLoadingMore = paginationStatus === 'LoadingMore';
	const shouldShowMobileTaskDetail =
		view === 'main' && Boolean(currentTaskId) && !shouldFilter && !hasRequestedMobileList;

	const handleScroll = (e: UIEvent<HTMLDivElement>) => {
		//
		const target = e.currentTarget;
		const { scrollTop, scrollHeight, clientHeight } = target;
		const scrollBottom = scrollHeight - scrollTop - clientHeight;

		if (scrollBottom < SCROLL_THRESHOLD && hasMore && !isLoadingMore) {
			loadMore(PAGE_SIZE);
		}
	};

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
					<>
						{shouldShowMobileTaskDetail && (
							<Suspense fallback={<Loading className="py-4" />}>
								<TaskDetail className="mb-4" />
							</Suspense>
						)}
						<div hidden={shouldShowMobileTaskDetail}>
							<LauncherContent
								currentTaskId={currentTaskId}
								isLoadingMore={isLoadingMore}
								onClose={close}
								onFeedback={handleFeedback}
								onNavigate={onSelect}
								onOpenThemePicker={openThemePicker}
								shouldUseSearch={shouldFilter}
								tasks={tasks}
							/>
						</div>
					</>
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
