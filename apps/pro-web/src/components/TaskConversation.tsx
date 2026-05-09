import { useNavigate, useSearch } from '@tanstack/react-router';
import type { Doc } from 'convex/_generated/dataModel';
import { useMutation, usePaginatedQuery } from 'convex/react';
import { ChevronDown } from 'lucide-react';
import { type RefCallback, Suspense, useEffect, useMemo, useState } from 'react';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';
import { Action } from '~/components/Action';
import { ActionComposer } from '~/components/ActionComposer/ActionComposer';
import { DebugAction } from '~/components/DebugAction';
import { EnergyDrawer } from '~/components/EnergyDrawer';
import { Button } from '@reactor/ui/button';
import { TaskConversationActions } from '~/components/TaskConversationActions';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { ComposerProvider } from '~/hooks/useComposer';
import { useDiscard, useResolve } from '~/hooks/useTaskMutations';
import { cn } from '@reactor/ui/lib/utils';
import { api } from 'convex/_generated/api';

import { Loading } from '~/components/Loading';
import { useCurrentTask } from '~/hooks/useCurrentTask';
import { useKeyboardShortcut } from '@reactor/ui/hooks/useKeyboardShortcuts';

const PAGE_SIZE = 35;
const NEAR_TOP_THRESHOLD = 200; // px

interface TaskConversationProps {
	className?: string;
	onToggleList?: () => void;
	onToggleTaskDetail?: () => void;
	isTaskListVisible?: boolean;
	isTaskDetailVisible?: boolean;
}

export function TaskConversation(props: TaskConversationProps) {
	//
	return (
		<Suspense fallback={<Loading />}>
			<TaskConversationContent {...props} />
		</Suspense>
	);
}

function TaskConversationContent({
	className,
	onToggleList,
	onToggleTaskDetail,
	isTaskListVisible = true,
	isTaskDetailVisible = true,
}: TaskConversationProps) {
	//
	const { task } = useCurrentTask();

	return (
		<ComposerProvider key={task._id} taskId={task._id}>
			<TaskConversationInner
				task={task}
				className={className}
				onToggleList={onToggleList}
				onToggleTaskDetail={onToggleTaskDetail}
				isTaskListVisible={isTaskListVisible}
				isTaskDetailVisible={isTaskDetailVisible}
			/>
		</ComposerProvider>
	);
}

function TaskConversationInner({
	task,
	className,
	onToggleList,
	onToggleTaskDetail,
	isTaskListVisible = true,
	isTaskDetailVisible = true,
}: TaskConversationProps & { task: Doc<'tasks'> }) {
	//
	const navigate = useNavigate();
	const user = useCurrentUser();
	const { debug, isEnergyDrawerOpen } = useSearch({ strict: false });
	const { discard, isDiscarding } = useDiscard();
	const { resolve, isResolving } = useResolve();

	const {
		results: actions,
		loadMore,
		status,
	} = usePaginatedQuery(
		api.action.findAllPaginated, //
		{ taskId: task._id },
		{ initialNumItems: PAGE_SIZE },
	);

	const reversedActions = useMemo(() => [...actions].reverse(), [actions]);
	const initialRenderDate = useMemo(() => new Date(), []);

	const markAsRead = useMutation(api.tasks.markAsRead);

	// Mark task as read when it's unread or blocked
	useEffect(() => {
		//
		if (task.status === 'unread') markAsRead({ taskId: task._id });
		//
	}, [task.status, markAsRead, task._id]);

	useKeyboardShortcut({
		global: true,
		combo: { key: 'b', withCommand: true },
		callback: (event) => {
			if (event.altKey) return;
			onToggleList?.();
		},
	});

	useKeyboardShortcut({
		global: true,
		combo: { key: 'b', withCommand: true, withAlt: true },
		callback: () => onToggleTaskDetail?.(),
	});

	return (
		<div className={cn('flex flex-col h-full', debug && 'px-0', className)}>
			<div className="flex justify-between items-center p-2">
				<TaskConversationActions
					task={task}
					onToggleList={onToggleList}
					onToggleTaskDetail={onToggleTaskDetail}
					isTaskListVisible={isTaskListVisible}
					isTaskDetailVisible={isTaskDetailVisible}
					isDebugMode={Boolean(debug)}
					isResolving={isResolving}
					isDiscarding={isDiscarding}
					resolve={resolve}
					discard={discard}
				/>
			</div>
			<StickToBottom mass={1} initial="instant" resize="instant" className="flex-1 overflow-auto">
				<StickToBottomContent
					actions={actions}
					status={status}
					loadMore={loadMore}
					className={debug ? 'gap-0' : 'gap-2'}
					isDebugMode={Boolean(debug)}
				>
					{reversedActions.map((action) =>
						debug ? (
							<DebugAction
								key={action._id}
								action={action}
								isAuthorCurrentUser={action.author === user._id}
							/>
						) : (
							<Action
								key={action._id}
								action={action}
								initialRenderDate={initialRenderDate}
								isAuthorCurrentUser={action.author === user._id}
								taskId={task._id}
							/>
						),
					)}
				</StickToBottomContent>
			</StickToBottom>

			<ActionComposer task={task} />

			<EnergyDrawer
				open={Boolean(isEnergyDrawerOpen)}
				onOpenChange={(open) =>
					navigate({
						to: '.',
						search: (prev) => ({ ...prev, isEnergyDrawerOpen: open || undefined }),
					})
				}
			/>
		</div>
	);
}

function StickToBottomContent({
	isDebugMode,
	actions,
	status,
	loadMore,
	children,
	className,
}: {
	isDebugMode: boolean;
	actions: Doc<'actions'>[];
	status: 'CanLoadMore' | 'LoadingMore' | 'Exhausted' | 'LoadingFirstPage';
	loadMore: (n: number) => void;
	children: React.ReactNode;
	className?: string;
}) {
	//
	const { isAtBottom, scrollToBottom, scrollRef } = useStickToBottomContext();
	const ref = scrollRef as RefCallback<HTMLDivElement> & {
		current: HTMLDivElement | null;
	}; // type hack, comes odd from useStickToBottomContext

	const [isLoaded, setIsLoaded] = useState(0);

	useEffect(() => {
		if (isLoaded > 0) return;
		if (actions.length > 0) setIsLoaded(isLoaded + 1);
	}, [actions.length, isLoaded]);

	// Infinite scroll, loads more when near the top TODO: abstract into a hook
	useEffect(() => {
		//
		const handleScroll = () => {
			//
			if (!ref.current) return;

			const isNearTop = ref.current.scrollTop < NEAR_TOP_THRESHOLD;

			// Workaround: force scrollTop to 1 if it's exactly 0.
			// When it is 0 and we get new events, the browser autoscroll to the new top.
			if (ref.current.scrollTop === 0) ref.current.scrollTop = 1;

			// Load more when near the top
			if (isNearTop && status === 'CanLoadMore') loadMore(PAGE_SIZE);
		};

		const scrollContainer = ref.current;
		scrollContainer?.addEventListener('scroll', handleScroll);

		return () => scrollContainer?.removeEventListener('scroll', handleScroll);
		// Keep ref.current in this dependency list intentionally: the listener is bound to the current
		// scroll container, not the stable callback ref wrapper from useStickToBottomContext.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loadMore, status, ref.current]);

	// Auto-scroll when new events are added and we're at the bottom
	useEffect(() => {
		//
		if (isAtBottom && actions.length > 0) {
			// TODO: this is a hack to make the scroll smooth when new events but instant at first
			// 1st render is usually empty
			// 2nd render has the actions loaded
			scrollToBottom(isLoaded > 1 ? 'smooth' : 'instant');
		}
		//
	}, [actions, isAtBottom, isLoaded, scrollToBottom]);

	return (
		<StickToBottom.Content className={cn('relative h-full', isDebugMode ? 'p-0' : 'p-2')}>
			<div className="h-full">
				{status === 'LoadingMore' && (
					<div className="px-4 pt-4">
						<Loading className="h-6 w-fit" />
					</div>
				)}
				<div className={cn('flex flex-col flex-grow justify-end py-2', className)}>{children}</div>
				<div className="sticky bottom-2 flex flex-col">
					<ScrollToBottom />
				</div>
			</div>
		</StickToBottom.Content>
	);
}

function ScrollToBottom({ className }: { className?: string }) {
	//
	const { isAtBottom, scrollToBottom } = useStickToBottomContext();
	const onClick = () => scrollToBottom();

	return (
		!isAtBottom && (
			<div className="flex justify-center z-10">
				<Button
					variant="outline"
					size="icon"
					className={cn(
						'h-8 w-8 rounded-full transition-all duration-150 ease-out',
						'translate-y-0 scale-100 opacity-100',
						className,
					)}
					onClick={onClick}
				>
					<ChevronDown className="size-4" />
				</Button>
			</div>
		)
	);
}
