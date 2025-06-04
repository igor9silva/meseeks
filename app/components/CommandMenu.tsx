import { useLocation, useNavigate } from '@tanstack/react-router';
import { defaultFilter, useCommandState } from 'cmdk';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuthActions } from '@convex-dev/auth/react';
import { asBigInt } from 'convex/utils/money';
import {
	BadgeCent,
	Circle,
	CircleCheckBig,
	CircleX,
	Inbox,
	LogOut,
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
import { useSplatParams } from '~/hooks/useSplatParams';
import { useTaskMutations } from '~/hooks/useTaskMutations';

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

	React.useEffect(() => {
		//
		const down = (e: KeyboardEvent) => {
			//
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				setIsOpen((open) => !open);
			}
		};

		document.addEventListener('keydown', down);
		return () => document.removeEventListener('keydown', down);
		//
	}, []);

	return <CommandMenuContext.Provider value={value}>{children}</CommandMenuContext.Provider>;
}

export function CommandMenuDialog() {
	//
	const { isOpen, close } = useCommandMenu();
	const { pathname, searchStr } = useLocation();
	const navigate = useNavigate();

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

				if (value === '/new') return result + 0.0000001; // make sure new task is always included

				return result;
			}}
		>
			<DialogTitle className="hidden">Global command menu</DialogTitle>
			<DialogDescription className="hidden">Search for tasks, notes, files, and more.</DialogDescription>
			<CommandInput placeholder="Act or search..." value={search} onValueChange={setSearch} />
			<CommandList>
				{/* Quick actions */}
				<CommandGroup heading="Quick actions">
					<NewTaskCommandItem shouldUseSearch={shouldFilter} />
					<CommandItem value="/" keywords={['inbox', 'index', 'home']} onSelect={onSelect}>
						<Inbox className="mr-2" />
						Go to Inbox
					</CommandItem>
					<CommandItem value="/top-up" keywords={['top', 'up']} onSelect={onSelect}>
						<BadgeCent className="mr-2" />
						Top up account
					</CommandItem>
					<CommandItem value="refresh" keywords={['refresh']} onSelect={() => location.reload()}>
						<RefreshCcw className="mr-2" />
						Refresh
					</CommandItem>
					<CommandItem value="/balance" keywords={['balance']} onSelect={onSelect}>
						<Wallet className="mr-2" />
						Balance
					</CommandItem>
					<CommandItem value="/skills" keywords={['skills', 'manage']} onSelect={onSelect}>
						<Sparkles className="mr-2" />
						Manage skills
					</CommandItem>
					<CommandItem value="signout" keywords={['sign', 'out']} onSelect={() => signOut()}>
						<LogOut className="mr-2" />
						Sign out
					</CommandItem>
					{currentTaskId && <ResolveTaskCommandItem taskId={currentTaskId} />}
					{currentTaskId && <DiscardTaskCommandItem taskId={currentTaskId} />}
					{currentTaskId && <IncreaseBudgetCommandItem taskId={currentTaskId} />}
					{currentTaskId && <ReopenTaskCommandItem taskId={currentTaskId} />}
					{currentTaskId && <StopReactionsCommandItem taskId={currentTaskId} />}
				</CommandGroup>

				{/* Pinned tasks */}
				{/* <CommandGroup heading="Pinned tasks">
					<CommandItem value="/" keywords={['inbox', 'index', 'home']} onSelect={onSelect}>
						<Inbox className="mr-2" />
						Go to Inbox
					</CommandItem>
					{/* <CommandItem
						value="/list/kh70vk1fpyg3mkf0jg1wmeerg9768ngv"
						keywords={['finances']}
						onSelect={onSelect}
					>
						<DollarSign className="mr-2" />
						Finances
					</CommandItem>
				</CommandGroup> */}

				{/* All tasks */}
				<CommandGroup heading="Tasks">
					{!tasks && <CommandLoading>Fetching tasks</CommandLoading>}
					{tasks?.map((task) => {
						return (
							<CommandItem
								key={task._id}
								value={`/chat/${task._id}`}
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
	const { resolve } = useTaskMutations();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || !currentTask.isActive) return null;

	const handleSelect = () => {
		//
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
	const { increaseBudget } = useTaskMutations();

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || currentTask.isActive) return null;

	const handleSelect = () => {
		//
		increaseBudget({ taskId: currentTask._id, amount: asBigInt({ dollars: 0.2 }) });
		close();
	};

	return (
		<CommandItem keywords={['reopen', 'current']} onSelect={handleSelect}>
			<RotateCcw className="mr-2" />
			Reopen with $0.20 of budget
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

	const currentTask = useQuery(api.tasks.public.findOne, { taskId });
	if (!currentTask || !currentTask.isActive) return null;

	const handleSelect = () => {
		//
		navigate({ to: '.', search: (prev) => ({ ...prev, isBudgetDrawerOpen: true }) });
		close();
	};

	return (
		<CommandItem keywords={['budget', 'add', 'increase']} onSelect={handleSelect}>
			<CircleCheckBig className="mr-2" />
			Add budget
		</CommandItem>
	);
}

function NewTaskCommandItem({ shouldUseSearch }: { shouldUseSearch: boolean }) {
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
			search: search ? { newTaskText: search } : {},
		});

		close();
		//
	}, [navigate, close, search]);

	return (
		<CommandItem value="/new" keywords={['new', 'task', search]} onSelect={handleSelect}>
			<SquarePen className="mr-2" />
			{search ? `Seek for "${search}"` : 'New task'}
		</CommandItem>
	);
}
