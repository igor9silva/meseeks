import { useLocation, useNavigate } from '@tanstack/react-router';
import { defaultFilter, useCommandState } from 'cmdk';
import { Loading } from '~/components/Loading';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';
import { usePaginatedQuery, useQuery } from 'convex/react';
import * as React from 'react';
import { startTransition, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuthActions } from '@convex-dev/auth/react';
import { asBigInt } from 'convex/lib/money';
import {
	BrushCleaning,
	CalendarClock,
	CalendarIcon,
	Circle,
	CircleCheckBig,
	CircleX,
	CodeXml,
	CreditCard,
	Github,
	Inbox,
	LogOut,
	MessageSquarePlus,
	NotebookPen,
	RefreshCcw,
	RotateCcw,
	Sparkles,
	SquarePen,
	Wallet,
} from 'lucide-react';
import {
	CommandDialog, //
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '~/components/ui/command';
import { DialogDescription, DialogTitle } from '~/components/ui/dialog';
import { useComposerVisibility } from '~/hooks/useComposerVisibility';
import { useFeedbackDialog } from '~/hooks/useFeedbackDialog';
import { useIsPro } from '~/hooks/useIsPro';
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts';
import { type LauncherContext, useLauncher } from '~/hooks/useLauncher';
import { useScheduleDialog } from '~/hooks/useScheduleDialog';
import { useSplatParams } from '~/hooks/useSplatParams';
import { useDecreaseBudget, useDiscard, useIncreaseBudget, useResolve, useStop } from '~/hooks/useTaskMutations';
import { LauncherComposer } from '~/components/Launcher';

interface CommandMenuContextType {
	isOpen: boolean;
	open: () => void;
	close: () => void;
}

const CommandMenuContext = React.createContext<CommandMenuContextType | null>(null);

export function useCommandMenu() {
	//
	const context = React.useContext(CommandMenuContext);

	if (!context) {
		throw new Error('useCommandMenu must be used within CommandMenuProvider');
	}

	return context;
}

export function CommandMenuProvider({ children }: { children: React.ReactNode }) {
	//
	const launcher = useLauncher();
	const { taskId } = useSplatParams();
	const { isComposerVisible, focusComposer } = useComposerVisibility();

	// legacy compatibility - expose isOpen/open/close for existing consumers
	const value = React.useMemo(
		() => ({
			isOpen: launcher.isOpen,
			open: () => launcher.openSearch(),
			close: () => launcher.close(),
		}),
		[launcher],
	);

	// command menu toggle shortcut (CMD+K)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'k' },
		callback: () => {
			startTransition(() => {
				if (launcher.isOpen) {
					launcher.close();
				} else {
					launcher.openSearch();
				}
			});
		},
	});

	// unified composer shortcut (CMD+I)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'i' },
		callback: () => {
			startTransition(() => {
				// if launcher is open and in composer mode, do nothing (focus is already there)
				if (launcher.isOpen && launcher.mode === 'composer') {
					return;
				}

				// if a composer is visible on the page, focus it
				if (isComposerVisible) {
					focusComposer();
					return;
				}

				// otherwise, open launcher in composer mode with current task context
				launcher.openComposer({ taskId });
			});
		},
	});

	return <CommandMenuContext.Provider value={value}>{children}</CommandMenuContext.Provider>;
}

export function CommandMenuDialog() {
	//
	const launcher = useLauncher();
	const { isOpen, close } = useCommandMenu();
	const { pathname, searchStr } = useLocation();
	const navigate = useNavigate();
	const inputRef = useRef<HTMLInputElement>(null);

	const feedbackDialog = useFeedbackDialog();
	const [search, setSearch] = useState(pathname + searchStr);

	// fetch task data if we have a taskId in context
	const taskContext = useLauncherTaskContext(launcher.context.taskId);

	useEffect(() => {
		setSearch(pathname + searchStr);
	}, [pathname, searchStr]);

	// reset to search mode when dialog closes
	useEffect(() => {
		if (!isOpen) {
			launcher.setMode('search');
		}
	}, [isOpen, launcher]);

	const shouldFilter = useMemo(() => {
		return search !== pathname + searchStr;
	}, [search, pathname, searchStr]);

	const onSelect = useCallback(
		(value: string) => {
			close();
			navigate({ to: value });
		},
		[navigate, close],
	);

	// handle Tab to switch between modes
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			// Tab switches to composer mode when search is empty or matches current path
			if (e.key === 'Tab' && !e.shiftKey && launcher.mode === 'search') {
				const isSearchEmpty = search === pathname + searchStr || search.trim() === '';
				if (isSearchEmpty) {
					e.preventDefault();
					launcher.setMode('composer');
				}
			}

			// Escape in composer mode goes back to search mode (not close)
			if (e.key === 'Escape' && launcher.mode === 'composer') {
				e.preventDefault();
				e.stopPropagation();
				launcher.setMode('search');
				// focus the input after switching back
				setTimeout(() => inputRef.current?.focus(), 0);
			}
		},
		[launcher, search, pathname, searchStr],
	);

	const PAGE_SIZE = 20;
	const SCROLL_THRESHOLD = 200; // pixels from the bottom of the list to trigger loading more

	// TODO: implement FN+Up/Down to navigate through the list

	// TODO: server-side search
	const {
		results: tasks,
		status: paginationStatus,
		loadMore,
	} = usePaginatedQuery(
		api.tasks.public.findAllPaginated,
		{ paginationOpts: { numItems: PAGE_SIZE, cursor: null } },
		{ initialNumItems: PAGE_SIZE },
	);

	const { taskId: currentTaskId } = useSplatParams();

	const { signOut } = useAuthActions();

	const hasMore = paginationStatus === 'CanLoadMore';
	const isLoadingMore = paginationStatus === 'LoadingMore';

	const handleScroll = useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
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

	const isComposerMode = launcher.mode === 'composer';

	return (
		<CommandDialog
			shouldFilter={!isComposerMode && shouldFilter}
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) close();
			}}
			filter={(value, search, keywords) => {
				//
				const result = defaultFilter?.(value, search, keywords) ?? 0;

				if (value === '/seek') return result + 0.0000001; // make sure new task is always included

				return result;
			}}
		>
			<DialogTitle className="hidden">
				{isComposerMode ? 'Compose message' : 'Global command menu'}
			</DialogTitle>
			<DialogDescription className="hidden">
				{isComposerMode ? 'Send a message to start or continue a task.' : 'Search for tasks, notes, files, and more.'}
			</DialogDescription>

			{/* composer mode */}
			{isComposerMode ? (
				<div onKeyDown={handleKeyDown}>
					<LauncherComposer context={taskContext} onClose={close} />
				</div>
			) : (
				/* search mode */
				<div onKeyDown={handleKeyDown}>
					<CommandInput
						ref={inputRef}
						placeholder="Act or search... (Tab to compose)"
						value={search}
						onValueChange={setSearch}
					/>
					<CommandList className="max-h-[500px]" onScroll={handleScroll}>
						{/* Quick actions */}
						<CommandGroup heading="Quick actions">
							{/* compose action - switches to composer mode */}
							<CommandItem
								value="compose"
								keywords={['compose', 'message', 'new', 'task', 'say']}
								onSelect={() => launcher.setMode('composer')}
							>
								<MessageSquarePlus className="mr-2" />
								Compose message
								<span className="ml-auto text-xs text-muted-foreground">Tab</span>
							</CommandItem>
							{currentTaskId && <ResolveTaskCommandItem taskId={currentTaskId} />}
							{currentTaskId && <DiscardTaskCommandItem taskId={currentTaskId} />}
							{currentTaskId && <IncreaseBudgetCommandItem taskId={currentTaskId} />}
							{currentTaskId && <DecreaseBudgetCommandItem taskId={currentTaskId} />}
							{currentTaskId && <ReopenTaskCommandItem taskId={currentTaskId} />}
							{currentTaskId && <StopReactionsCommandItem taskId={currentTaskId} />}
							{currentTaskId && <ScheduleIterationCommandItem taskId={currentTaskId} />}
							<CommandItem
								value="feedback"
								keywords={['feedback', 'report', 'bug', 'suggest', 'give']}
								onSelect={() => {
									close();
									feedbackDialog.open();
								}}
							>
								<NotebookPen className="mr-2" />
								Give feedback
							</CommandItem>
							<CommandItem value="refresh" keywords={['refresh']} onSelect={() => location.reload()}>
								<RefreshCcw className="mr-2" />
								Refresh
							</CommandItem>
						</CommandGroup>

						{/* Shortcuts - these are navigation items */}
						<CommandGroup heading="Shortcuts">
							<CommandItem value="/" keywords={['inbox', 'index', 'home']} onSelect={onSelect}>
								<Inbox className="mr-2" />
								Go to Inbox
							</CommandItem>
							<CommandItem value="/new" keywords={['new', 'task']} onSelect={onSelect}>
								<SquarePen className="mr-2" />
								New task
							</CommandItem>
							<SeekCommandItem shouldUseSearch={shouldFilter} />
							{/* <CommandItem value="/top-up" keywords={['top', 'up']} onSelect={onSelect}>
								<BadgeCent className="mr-2" />
								Top up account
							</CommandItem> */}
							<CommandItem
								value="/balance"
								keywords={['balance', 'top', 'up', 'top-up', 'transactions', 'expenses', 'energy', 'account']}
								onSelect={onSelect}
							>
								<Wallet className="mr-2" />
								Balance & account
							</CommandItem>
							<Suspense fallback={null}>
								<SubscribeCommandItem onSelect={onSelect} />
							</Suspense>
							<CommandItem value="/skills" keywords={['skills', 'manage']} onSelect={onSelect}>
								<Sparkles className="mr-2" />
								Manage skills
							</CommandItem>
							<CommandItem value="/schedules" keywords={['schedules', 'manage', 'schedule']} onSelect={onSelect}>
								<CalendarIcon className="mr-2" />
								See schedules
							</CommandItem>
							<DevModeCommandItem />
							<CommandItem
								value="github"
								keywords={['github', 'source', 'code', 'repository']}
								onSelect={() => {
									window.open('https://github.com/igor9silva/meseeks', '_blank');
									close();
								}}
							>
								<Github className="mr-2" />
								View source code on GitHub
							</CommandItem>
							<CommandItem value="signout" keywords={['sign', 'out']} onSelect={() => signOut()}>
								<LogOut className="mr-2" />
								Sign out
							</CommandItem>
						</CommandGroup>

						{/* All tasks */}
						<CommandGroup heading="Tasks">
							{tasks.map((task) => {
								return (
									<CommandItem
										key={task._id}
										value={`/task/${task._id}`}
										keywords={[task.title ?? 'Untitled task']}
										onSelect={onSelect}
									>
										{!task.isActive ? <CircleCheckBig className="mr-2" /> : <Circle className="mr-2" />}
										<span className={!task.isActive ? 'line-through' : ''}>
											{task.title ?? 'Untitled task'}
										</span>
									</CommandItem>
								);
							})}
							{isLoadingMore && <Loading className="py-4" />}
						</CommandGroup>
					</CommandList>
				</div>
			)}
		</CommandDialog>
	);
}

/**
 * helper hook to get task data for the launcher context
 */
function useLauncherTaskContext(taskId?: Id<'tasks'>): LauncherContext {
	//
	const task = useQuery(api.tasks.public.findOneOrNot, { taskId });

	return useMemo(
		() => ({
			taskId,
			task: task ?? undefined,
		}),
		[taskId, task],
	);
}

function ResolveTaskCommandItem({ taskId }: { taskId: Id<'tasks'> }) {
	//
	const { close } = useCommandMenu();
	const { resolve, isResolving } = useResolve();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || !currentTask.isActive) return null;

	const handleSelect = () => {
		if (isResolving) return;
		resolve({ taskId: currentTask._id });
		close();
	};

	return (
		<CommandItem keywords={['done', 'resolve', 'current']} onSelect={handleSelect}>
			<CircleCheckBig className="mr-2" />
			Resolve current task
		</CommandItem>
	);
}

function DiscardTaskCommandItem({ taskId }: { taskId: Id<'tasks'> }) {
	//
	const { close } = useCommandMenu();
	const { discard, isDiscarding } = useDiscard();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || !currentTask.isActive) return null;

	const handleSelect = () => {
		//
		if (isDiscarding) return;
		discard({ taskId: currentTask._id });
		close();
	};

	return (
		<CommandItem keywords={['discard', 'trash', 'archive', 'current']} onSelect={handleSelect}>
			<CircleX className="mr-2" />
			Discard current task
		</CommandItem>
	);
}

function ReopenTaskCommandItem({ taskId }: { taskId: Id<'tasks'> }) {
	//
	const { close } = useCommandMenu();
	const { increaseBudget, isIncreasingBudget } = useIncreaseBudget();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || currentTask.isActive) return null;

	const handleSelect = () => {
		//
		if (isIncreasingBudget) return;
		increaseBudget({ taskId: currentTask._id, amount: asBigInt({ dollars: 0.5 }) });
		close();
	};

	return (
		<CommandItem keywords={['reopen', 'current']} onSelect={handleSelect}>
			<RotateCcw className="mr-2" />
			Reopen with $0.50 of budget
		</CommandItem>
	);
}

function StopReactionsCommandItem({ taskId }: { taskId: Id<'tasks'> }) {
	//
	const { close } = useCommandMenu();
	const { stop, isStopping } = useStop();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || currentTask.status !== 'acting') return null;

	const handleSelect = () => {
		//
		if (isStopping) return;
		stop({ taskId: currentTask._id });
		close();
	};

	return (
		<CommandItem keywords={['stop', 'reactions', 'reacting', 'current']} onSelect={handleSelect}>
			<RotateCcw className="mr-2" />
			Stop reacting
		</CommandItem>
	);
}

function IncreaseBudgetCommandItem({ taskId }: { taskId: Id<'tasks'> }) {
	//
	const { close } = useCommandMenu();
	const navigate = useNavigate();
	const location = useLocation();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || !currentTask.isActive) return null;

	const handleSelect = () => {
		//
		navigate({
			to: location.pathname,
			search: (prev) => ({ ...prev, isBudgetDrawerOpen: true }),
		});
		close();
	};

	return (
		<CommandItem keywords={['energy', 'budget', 'add', 'increase']} onSelect={handleSelect}>
			<CircleCheckBig className="mr-2" />
			Add energy
		</CommandItem>
	);
}

function DecreaseBudgetCommandItem({ taskId }: { taskId: Id<'tasks'> }) {
	//
	const { close } = useCommandMenu();
	const { decreaseBudget, isDecreasingBudget } = useDecreaseBudget();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || !currentTask.isActive || currentTask.energyBudget.available <= 0n) return null;

	const handleSelect = () => {
		if (isDecreasingBudget) return;
		decreaseBudget({ taskId: currentTask._id, amount: currentTask.energyBudget.available });
		close();
	};

	return (
		<CommandItem keywords={['energy', 'budget', 'decrease', 'reduce', 'clear']} onSelect={handleSelect}>
			<BrushCleaning className="mr-2" />
			Clear energy (remove remaining budget)
		</CommandItem>
	);
}

function ScheduleIterationCommandItem({ taskId }: { taskId: Id<'tasks'> }) {
	//
	const { close } = useCommandMenu();
	const scheduleDialog = useScheduleDialog();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || !currentTask.isActive) return null;

	const handleSelect = () => {
		//
		scheduleDialog.open(taskId);
		close();
	};

	return (
		<CommandItem keywords={['schedule', 'iteration', 'current']} onSelect={handleSelect}>
			<CalendarClock className="mr-2" />
			Schedule iteration
		</CommandItem>
	);
}

function SeekCommandItem({ shouldUseSearch }: { shouldUseSearch: boolean }) {
	//
	const { close } = useCommandMenu();
	const navigate = useNavigate();

	const typedSearch = useCommandState((state) => state.search);

	const search = useMemo(() => {
		if (!shouldUseSearch) return '';
		return typedSearch;
	}, [shouldUseSearch, typedSearch]);

	const handleSelect = useCallback(() => {
		//
		navigate({
			to: '/$',
			params: { _splat: '/new' },
			search: search ? { q: search } : {},
		});

		close();
		//
	}, [navigate, close, search]);

	// Only show this item when there's actually a search term
	if (!search) return null;

	return (
		<CommandItem value={`/seek`} keywords={['seek', 'search', search]} onSelect={handleSelect}>
			<SquarePen className="mr-2" />
			{`Seek for "${search}"`}
		</CommandItem>
	);
}

function DevModeCommandItem() {
	//
	const { close } = useCommandMenu();
	const navigate = useNavigate();
	const { pathname, search } = useLocation();

	const isDebugMode = Boolean(search.debug);

	const handleToggleDebug = () => {
		//
		navigate({
			to: pathname,
			search: (prev) => ({ ...prev, debug: isDebugMode ? undefined : true }),
		});
		close();
	};

	return (
		<CommandItem
			value="toggle-debug"
			keywords={['debug', 'dev', 'development', 'toggle']}
			onSelect={handleToggleDebug}
		>
			<CodeXml className="mr-2" />
			{isDebugMode ? 'Disable' : 'Enable'} Dev Mode
		</CommandItem>
	);
}

function SubscribeCommandItem({ onSelect }: { onSelect: (value: string) => void }) {
	//
	const { isPro } = useIsPro();

	if (isPro) return null;

	return (
		<CommandItem
			value="/subscribe"
			keywords={['subscribe', 'pro', 'upgrade', 'premium', 'plan', 'go pro']}
			onSelect={onSelect}
		>
			<CreditCard className="mr-2" />
			Go Pro (subscribe)
		</CommandItem>
	);
}
