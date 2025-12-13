import { useLocation, useNavigate } from '@tanstack/react-router';
import { defaultFilter, useCommandState } from 'cmdk';
import { Loading } from '~/components/Loading';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';
import { usePaginatedQuery, useQuery } from 'convex/react';
import * as React from 'react';
import { startTransition, Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { useAuthActions } from '@convex-dev/auth/react';
import { asBigInt } from 'convex/lib/money';
import {
	ArrowUp,
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
import { ActionButton } from '~/components/ui/action-button';
import { Badge } from '~/components/ui/badge';
import {
	CommandDialog, //
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandLoading,
} from '~/components/ui/command';
import { DialogDescription, DialogTitle } from '~/components/ui/dialog';
import { PromptInput, PromptInputActions, PromptInputTextarea } from '~/components/ui/prompt-input';
import { useFeedbackDialog } from '~/hooks/useFeedbackDialog';
import { useIsPro } from '~/hooks/useIsPro';
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts';
import { useScheduleDialog } from '~/hooks/useScheduleDialog';
import { useSplatParams } from '~/hooks/useSplatParams';
import {
	useAddTask,
	useDecreaseBudget,
	useDiscard,
	useIncreaseBudget,
	useRequestIteration,
	useResolve,
	useSay,
	useStop,
} from '~/hooks/useTaskMutations';

interface CommandMenuContextType {
	isOpen: boolean;
	mode: CommandMenuMode;
	open: () => void;
	openComposer: () => void;
	setMode: (mode: CommandMenuMode) => void;
	close: () => void;
}

type CommandMenuMode = 'launcher' | 'composer';

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
	const [mode, setMode] = React.useState<CommandMenuMode>('launcher');

	const value = React.useMemo(
		() => ({
			isOpen,
			mode,
			open: () => {
				setMode('launcher');
				setIsOpen(true);
			},
			openComposer: () => {
				setMode('composer');
				setIsOpen(true);
			},
			setMode,
			close: () => {
				setIsOpen(false);
				setMode('launcher');
			},
		}),
		[isOpen, mode],
	);

	// command menu toggle shortcut (CMD+K)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'k' },
		callback: () => {
			// use startTransition to mark this as non-urgent and prevent blocking
			startTransition(() => {
				setIsOpen((open) => {
					if (open) return false;
					setMode('launcher');
					return true;
				});
			});
		},
	});

	// unified composer shortcut (CMD+I)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'i' },
		callback: () => {
			//
			const activeElement = document.activeElement;
			const isComposerInputFocused =
				activeElement instanceof HTMLElement && activeElement.dataset['meseeksComposerInput'] === 'true';

			// let the focused composer handle CMD+I (quick actions rotation)
			if (isComposerInputFocused) return;

			// if launcher is already open, always switch to composer mode
			if (isOpen) {
				setMode('composer');
				return;
			}

			const didFocusComposer = focusVisibleComposerInput();
			if (didFocusComposer) return;

			setMode('composer');
			setIsOpen(true);
		},
	});

	return <CommandMenuContext.Provider value={value}>{children}</CommandMenuContext.Provider>;
}

export function CommandMenuDialog() {
	//
	const { isOpen, mode, setMode, close } = useCommandMenu();
	const navigate = useNavigate();

	const feedbackDialog = useFeedbackDialog();
	const [search, setSearch] = useState('');
	const commandInputRef = React.useRef<HTMLInputElement>(null);

	const shouldFilter = useMemo(() => {
		return Boolean(search);
	}, [search]);

	useEffect(() => {
		//
		if (!isOpen) return;
		setSearch('');
	}, [isOpen]);

	useEffect(() => {
		//
		if (!isOpen) return;
		if (mode !== 'launcher') return;
		commandInputRef.current?.focus();
	}, [isOpen, mode]);

	const onSelect = useCallback(
		(value: string) => {
			close();
			navigate({ to: value });
		},
		[navigate, close],
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
			shouldFilter={mode === 'launcher' && shouldFilter}
			open={isOpen}
			onOpenChange={close}
			filter={(value, search, keywords) => {
				//
				const result = defaultFilter?.(value, search, keywords) ?? 0;

				if (value === '/seek') return result + 0.0000001; // make sure new task is always included

				return result;
			}}
		>
			<DialogTitle className="hidden">Global command menu</DialogTitle>
			<DialogDescription className="hidden">Search for tasks, notes, files, and more.</DialogDescription>
			{mode === 'launcher' && (
				<>
					<CommandInput
						ref={commandInputRef}
						placeholder="Act or search..."
						value={search}
						onValueChange={setSearch}
						onKeyDown={(e) => {
							//
							if (e.key !== 'Tab') return;
							if (e.shiftKey) return;
							if (search) return;
							e.preventDefault();
							setMode('composer');
						}}
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
								keywords={[
									'balance',
									'top',
									'up',
									'top-up',
									'transactions',
									'expenses',
									'energy',
									'account',
								]}
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
							<CommandItem
								value="/schedules"
								keywords={['schedules', 'manage', 'schedule']}
								onSelect={onSelect}
							>
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
										{!task.isActive ? (
											<CircleCheckBig className="mr-2" />
										) : (
											<Circle className="mr-2" />
										)}
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
			)}
			{mode === 'composer' && (
				<CommandMenuComposerMode currentTaskId={currentTaskId} onExit={() => setMode('launcher')} />
			)}
		</CommandDialog>
	);
}

type CommandMenuComposerQuickActionKey = 'say' | 'iterate';

function CommandMenuComposerMode({
	currentTaskId,
	onExit,
}: {
	currentTaskId: Id<'tasks'> | undefined;
	onExit: () => void;
}) {
	//
	const { close } = useCommandMenu();
	const navigate = useNavigate();
	const { addTask, isAdding } = useAddTask();
	const { say, isSaying } = useSay();
	const { requestIteration, isRequestingIteration } = useRequestIteration();

	const textareaRef = React.useRef<HTMLTextAreaElement>(null);

	const [message, setMessage] = useState('');
	const [quickActionKey, setQuickActionKey] = useState<CommandMenuComposerQuickActionKey>('say');

	const sayDraftRef = React.useRef('');

	const hasAttachedTask = Boolean(currentTaskId);
	const canIterate = hasAttachedTask;
	const hasMessage = Boolean(message.trim());

	const isAnyPending = isAdding || isSaying || isRequestingIteration;

	const placeholder = useMemo(() => {
		if (quickActionKey === 'iterate') return 'request another iteration';
		return "what's next?";
	}, [quickActionKey]);

	const rotateQuickAction = useCallback(() => {
		//
		if (!canIterate) return;
		if (quickActionKey === 'say') {
			sayDraftRef.current = message;
			setMessage('');
			setQuickActionKey('iterate');
			return;
		}

		setQuickActionKey('say');
		setMessage(sayDraftRef.current);
	}, [canIterate, message, quickActionKey]);

	useEffect(() => {
		//
		const textarea = textareaRef.current;
		if (!textarea) return;
		textarea.focus();
		const length = textarea.value.length;
		textarea.setSelectionRange(length, length);
	}, []);

	useKeyboardShortcut({
		targetRef: textareaRef,
		combo: { withCommand: true, key: 'i' },
		callback: rotateQuickAction,
	});

	const submit = useCallback(() => {
		//
		if (isAnyPending) return;

		if (quickActionKey === 'iterate') {
			if (!currentTaskId) return;
			requestIteration(
				{ taskId: currentTaskId },
				{
					onSuccess: () => close(),
				},
			);
			return;
		}

		if (!hasMessage) return;
		const trimmedMessage = message.trim();

		if (currentTaskId) {
			say(
				{ taskId: currentTaskId, message: trimmedMessage },
				{
					onSuccess: () => {
						setMessage('');
						close();
					},
				},
			);
			return;
		}

		addTask(
			{
				message: trimmedMessage,
				initialFunds: 0.2,
				intelligence: undefined,
			},
			{
				onSuccess: (taskId) => {
					close();
					navigate({ to: '/$', params: { _splat: `/task/${taskId}` } });
				},
			},
		);
	}, [
		isAnyPending,
		quickActionKey,
		currentTaskId,
		requestIteration,
		close,
		hasMessage,
		message,
		say,
		addTask,
		navigate,
	]);

	return (
		<div>
			<div className="flex items-center justify-between gap-2 border-b px-3 py-2">
				<div className="flex items-center gap-2 min-w-0">
					<CommandMenuComposerAttachmentStrip taskId={currentTaskId} />
					<Badge variant="outline" className="rounded-full">
						skill: {quickActionKey}
					</Badge>
				</div>
				<div className="flex items-center gap-2 text-xs text-muted-foreground">
					<kbd className="inline-flex h-5 items-center rounded border bg-muted px-1 font-mono text-xs">
						tab
					</kbd>
					<span>to go back</span>
				</div>
			</div>
			<div className="p-3">
				<PromptInput
					disabled={isAnyPending}
					onSubmit={(e) => {
						//
						e.preventDefault();
						submit();
					}}
				>
					<PromptInputTextarea
						inputRef={textareaRef}
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder={placeholder}
						data-meseeks-composer-input="true"
						onKeyDown={(e) => {
							//
							if (e.key !== 'Tab') return;
							if (e.shiftKey) return;
							if (hasMessage) return;
							e.preventDefault();
							onExit();
						}}
					/>
					<div className="flex items-center justify-between gap-2 px-2">
						<div className="text-xs text-muted-foreground min-h-5">
							{canIterate && 'press ⌘i again to rotate quick actions'}
						</div>
						<PromptInputActions>
							{canIterate && (
								<ActionButton
									icon={<Sparkles className="size-5" />}
									onClick={() => {
										if (!canIterate) return;
										if (quickActionKey === 'iterate') return;
										rotateQuickAction();
										textareaRef.current?.focus();
									}}
									tooltip="iterate"
									variant="secondary"
									disabled={isAnyPending}
								/>
							)}
							<ActionButton
								icon={<ArrowUp className="size-5" />}
								onClick={submit}
								tooltip="act"
								disabled={isAnyPending || (quickActionKey === 'say' && !hasMessage)}
							/>
						</PromptInputActions>
					</div>
				</PromptInput>
			</div>
		</div>
	);
}

function CommandMenuComposerAttachmentStrip({ taskId }: { taskId: Id<'tasks'> | undefined }) {
	//
	if (!taskId) {
		return (
			<Badge variant="secondary" className="rounded-full">
				new task
			</Badge>
		);
	}

	return <AttachedTaskBadge taskId={taskId} />;
}

function AttachedTaskBadge({ taskId }: { taskId: Id<'tasks'> }) {
	//
	const task = useQuery(api.tasks.public.findOne, { taskId });

	if (!task) {
		return (
			<Badge variant="secondary" className="rounded-full max-w-64 truncate">
				task: {taskId}
			</Badge>
		);
	}

	return (
		<Badge variant="secondary" className="rounded-full max-w-64 truncate">
			task: {task.title ?? 'untitled task'}
		</Badge>
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

const MESEEKS_COMPOSER_INPUT_SELECTOR = '[data-meseeks-composer-input="true"]';

function focusVisibleComposerInput() {
	//
	const composerInputs = Array.from(document.querySelectorAll<HTMLElement>(MESEEKS_COMPOSER_INPUT_SELECTOR));

	for (const composerInput of composerInputs) {
		if (!isElementVisible(composerInput)) continue;

		if (!(composerInput instanceof HTMLTextAreaElement || composerInput instanceof HTMLInputElement)) continue;

		composerInput.focus();

		const length = composerInput.value.length;
		composerInput.setSelectionRange(length, length);

		return true;
	}

	return false;
}

function isElementVisible(element: HTMLElement) {
	//
	if (!element.isConnected) return false;

	const style = window.getComputedStyle(element);
	if (style.display === 'none') return false;
	if (style.visibility === 'hidden') return false;

	const rect = element.getBoundingClientRect();
	const hasSize = rect.width > 0 && rect.height > 0;
	if (!hasSize) return false;

	return true;
}
