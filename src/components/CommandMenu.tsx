import { useLocation, useNavigate } from '@tanstack/react-router';
import { defaultFilter, useCommandState } from 'cmdk';
import { api } from 'convex/_generated/api';
import type { Id } from 'convex/_generated/dataModel';
import { useQuery } from 'convex/react';
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
	CommandDialog,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandLoading,
} from '~/components/ui/command';
import { DialogDescription, DialogTitle } from '~/components/ui/dialog';
import { useFeedbackDialog } from '~/hooks/useFeedbackDialog';
import { useIsPro } from '~/hooks/useIsPro';
import { useKeyboardShortcut } from '~/hooks/useKeyboardShortcuts';
import { useScheduleDialog } from '~/hooks/useScheduleDialog';
import { useSplatParams } from '~/hooks/useSplatParams';
import { useDecreaseBudget, useIncreaseBudget, useResolve, useTaskMutations } from '~/hooks/useTaskMutations';

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
	const [isOpen, setIsOpen] = React.useState(false);

	const value = React.useMemo(
		() => ({
			isOpen,
			open: () => setIsOpen(true),
			close: () => setIsOpen(false),
		}),
		[isOpen],
	);

	// command menu toggle shortcut (CMD+K)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'k' },
		callback: () => {
			// use startTransition to mark this as non-urgent and prevent blocking
			startTransition(() => {
				setIsOpen((open) => !open);
			});
		},
	});

	return <CommandMenuContext.Provider value={value}>{children}</CommandMenuContext.Provider>;
}

export function CommandMenuDialog() {
	//
	const { isOpen, close } = useCommandMenu();
	const { pathname, searchStr } = useLocation();
	const navigate = useNavigate();

	const feedbackDialog = useFeedbackDialog();
	const [search, setSearch] = useState(pathname + searchStr);

	// new task shortcut (⌥+N)
	useKeyboardShortcut({
		global: true,
		combo: { withCommand: true, key: 'j' },
		callback: (e) => {
			console.log('new task shortcut triggered', e);
			// use startTransition to mark navigation as non-urgent
			startTransition(() => {
				navigate({ to: '/$', params: { _splat: '/new' } });
			});
		},
	});

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

	const tasks = useQuery(api.tasks.public.findAll, {}); // TODO: server-side search
	const { taskId: currentTaskId } = useSplatParams();

	const { signOut } = useAuthActions();

	return (
		<CommandDialog
			shouldFilter={shouldFilter}
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
			<CommandInput placeholder="Act or search..." value={search} onValueChange={setSearch} />
			<CommandList className="max-h-[500px]">
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
					{!tasks && <CommandLoading>Fetching tasks</CommandLoading>}
					{tasks?.map((task) => {
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
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}

function ResolveTaskCommandItem({ taskId }: { taskId: Id<'tasks'> }) {
	//
	const { close } = useCommandMenu();
	const { resolve, isPending } = useResolve();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || !currentTask.isActive) return null;

	const handleSelect = () => {
		if (isPending) return;
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
	const { discard } = useTaskMutations();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || !currentTask.isActive) return null;

	const handleSelect = () => {
		//
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
	const { increaseBudget, isPending } = useIncreaseBudget();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || currentTask.isActive) return null;

	const handleSelect = () => {
		//
		if (isPending) return;
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
	const { stop } = useTaskMutations();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || currentTask.status !== 'acting') return null;

	const handleSelect = () => {
		//
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
	const { decreaseBudget, isPending } = useDecreaseBudget();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || !currentTask.isActive || currentTask.energyBudget.available <= 0n) return null;

	const handleSelect = () => {
		if (isPending) return;
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
