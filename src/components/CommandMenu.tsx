import { useLocation, useNavigate } from '@tanstack/react-router';
import { defaultFilter, useCommandState } from 'cmdk';
import { Loading } from '~/components/Loading';
import { api } from 'convex/_generated/api';
import type { Doc, Id } from 'convex/_generated/dataModel';
import { usePaginatedQuery, useQuery } from 'convex/react';
import * as React from 'react';
import { startTransition, Suspense, useCallback, useEffect, useMemo, useState } from 'react';

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
	CommandLoading,
} from '~/components/ui/command';
import { DialogDescription, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { useFeedbackDialog } from '~/hooks/useFeedbackDialog';
import { useIsPro } from '~/hooks/useIsPro';
import { useComposerFocusRegistry } from '~/hooks/useComposerFocus';
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts';
import { useScheduleDialog } from '~/hooks/useScheduleDialog';
import { useSplatParams } from '~/hooks/useSplatParams';
import { useDecreaseBudget, useDiscard, useIncreaseBudget, useResolve, useStop } from '~/hooks/useTaskMutations';
import { ActionComposer } from './ActionComposer/ActionComposer';
import { QuickSeekContent } from './QuickSeek';

type CommandMenuMode = 'command' | 'compose';

interface CommandMenuContextType {
	isOpen: boolean;
	mode: CommandMenuMode;
	open: (nextMode?: CommandMenuMode) => void;
	close: () => void;
	setMode: (nextMode: CommandMenuMode) => void;
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
	const [isOpen, setIsOpen] = React.useState(false);
	const [mode, setMode] = React.useState<CommandMenuMode>('command');
	const { focusVisibleComposer } = useComposerFocusRegistry();

	const value = React.useMemo(
		() => ({
			isOpen,
			mode,
			open: (nextMode: CommandMenuMode = 'command') => {
				setMode(nextMode);
				setIsOpen(true);
			},
			close: () => {
				setIsOpen(false);
				setMode('command');
			},
			setMode,
		}),
		[isOpen, mode, setMode],
	);

	// command menu toggle shortcut (CMD+K)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'k' },
		callback: () => {
			// use startTransition to mark this as non-urgent and prevent blocking
			startTransition(() => {
				setMode('command');
				setIsOpen((open) => !open);
			});
		},
	});

	// unified composer shortcut (CMD+I)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'i' },
		callback: () => {
			const didFocus = focusVisibleComposer();
			if (didFocus) return;

			startTransition(() => {
				setMode('compose');
				setIsOpen(true);
			});
		},
	});

	return <CommandMenuContext.Provider value={value}>{children}</CommandMenuContext.Provider>;
}

export function CommandMenuDialog() {
	//
	const { isOpen, close, mode, setMode } = useCommandMenu();
	const { pathname, searchStr } = useLocation();
	const navigate = useNavigate();

	const feedbackDialog = useFeedbackDialog();
	const [search, setSearch] = useState(pathname + searchStr);

	useEffect(() => {
		setSearch(pathname + searchStr);
	}, [pathname, searchStr]);

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

	useEffect(() => {
		if (!isOpen || mode !== 'compose') return;

		const handleEscape = (event: KeyboardEvent) => {
			//
			if (event.key === 'Tab' || event.key === 'Escape') {
				event.preventDefault();
				setMode('command');
			}
		};

		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen, mode, setMode]);

	const handleCommandInputKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			if (event.key === 'Tab' && !search) {
				event.preventDefault();
				setMode('compose');
			}
		},
		[search, setMode],
	);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				close();
			}
		},
		[close],
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

	return (
		<CommandDialog
			shouldFilter={mode === 'command' ? shouldFilter : false}
			open={isOpen}
			onOpenChange={handleOpenChange}
			filter={
				mode === 'command'
					? (value, search, keywords) => {
							//
							const result = defaultFilter?.(value, search, keywords) ?? 0;

							if (value === '/seek') return result + 0.0000001; // make sure new task is always included

							return result;
						}
					: undefined
			}
		>
			<DialogTitle className="hidden">Global command menu</DialogTitle>
			<DialogDescription className="hidden">Search for tasks, notes, files, and more.</DialogDescription>
			{mode === 'command' ? (
				<>
					<CommandInput
						placeholder="Act or search..."
						value={search}
						onValueChange={setSearch}
						onKeyDown={handleCommandInputKeyDown}
					/>
					<CommandList className="max-h-[500px]" onScroll={handleScroll}>
						{/* Quick actions */}
						<CommandGroup heading="Quick actions">
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
				</>
			) : (
				<LauncherComposer onExitToCommand={() => setMode('command')} />
			)}
		</CommandDialog>
	);
}

function LauncherComposer({ onExitToCommand }: { onExitToCommand: () => void }) {
	//
	const { taskId: currentTaskId } = useSplatParams();
	const currentTask = useQuery(api.tasks.public.findOneOrNot, { taskId: currentTaskId ?? undefined });

	if (currentTaskId && !currentTask) {
		return <Loading className="py-4" />;
	}

	const shouldShowTaskComposer = Boolean(currentTask);

	const composer = shouldShowTaskComposer && currentTask ? (
		<ActionComposer task={currentTask} />
	) : (
		<QuickSeekContent className="border-none shadow-none" />
	);

	return (
		<div className="flex flex-col gap-3 p-2">
			<div className="flex items-center justify-between gap-2">
				<AttachmentStrip task={currentTask ?? undefined} />
				<Button variant="ghost" size="sm" onClick={onExitToCommand}>
					Back to launcher
				</Button>
			</div>
			{composer}
		</div>
	);
}

function AttachmentStrip({ task }: { task?: Doc<'tasks'> }) {
	//
	const hasTask = Boolean(task);
	const contextLabel = hasTask ? 'Current task' : 'New task';
	const contextTitle = hasTask ? task?.title ?? 'Untitled task' : 'Composer will create a new task';

	return (
		<div className="flex items-center gap-3 rounded-full border bg-muted/40 px-3 py-2">
			<div className="flex flex-col">
				<span className="text-xs text-muted-foreground">{contextLabel}</span>
				<span className="text-sm font-medium truncate max-w-56">{contextTitle}</span>
			</div>
		</div>
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
