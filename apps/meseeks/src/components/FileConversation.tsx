import { useNavigate, useSearch } from '@tanstack/react-router';
import type { Doc } from 'convex/_generated/dataModel';
import { useMutation, usePaginatedQuery } from 'convex/react';
import { ChevronDown } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';
import { Action } from '~/components/Action';
import { ActionComposer } from '~/components/ActionComposer/ActionComposer';
import { DebugAction } from '~/components/DebugAction';
import { EnergyDrawer } from '~/components/EnergyDrawer';
import { Button } from '@pro/ui/button';
import { FileConversationActions } from '~/components/FileConversationActions';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { ComposerProvider } from '~/hooks/useComposer';
import { useDiscard, useResolve } from '~/hooks/useFileMutations';
import { cn } from '@pro/ui/lib/utils';
import { api } from 'convex/_generated/api';

import { Loading } from '~/components/Loading';
import { useCurrentFile } from '~/hooks/useCurrentFile';
import { useKeyboardShortcut } from '@pro/ui/hooks/useKeyboardShortcuts';
import type { FileView } from '~/hooks/query/useFile';

const PAGE_SIZE = 35;
const NEAR_TOP_THRESHOLD = 200; // px

interface FileConversationProps {
	className?: string;
	onToggleList?: () => void;
	onToggleFileDetail?: () => void;
	isFileListVisible?: boolean;
	isFileDetailVisible?: boolean;
}

export function FileConversation(props: FileConversationProps) {
	//
	return (
		<Suspense fallback={<Loading />}>
			<FileConversationContent {...props} />
		</Suspense>
	);
}

function FileConversationContent({
	className,
	onToggleList,
	onToggleFileDetail,
	isFileListVisible = true,
	isFileDetailVisible = true,
}: FileConversationProps) {
	//
	const { file } = useCurrentFile();

	return (
		<ComposerProvider key={file._id} fileId={file._id}>
			<FileConversationInner
				file={file}
				className={className}
				onToggleList={onToggleList}
				onToggleFileDetail={onToggleFileDetail}
				isFileListVisible={isFileListVisible}
				isFileDetailVisible={isFileDetailVisible}
			/>
		</ComposerProvider>
	);
}

function FileConversationInner({
	file,
	className,
	onToggleList,
	onToggleFileDetail,
	isFileListVisible = true,
	isFileDetailVisible = true,
}: FileConversationProps & { file: FileView }) {
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
		api.actions.findAllPaginated, //
		{ fileId: file._id },
		{ initialNumItems: PAGE_SIZE },
	);

	const reversedActions = useMemo(() => [...actions].reverse(), [actions]);
	const initialRenderDate = useMemo(() => new Date(), []);

	const markAsRead = useMutation(api.fileViews.markAsRead);

	// mark file as read when it is unread or blocked
	useEffect(() => {
		//
		if (file.status === 'unread') markAsRead({ fileId: file._id });
		//
	}, [file.status, markAsRead, file._id]);

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
		callback: () => onToggleFileDetail?.(),
	});

	return (
		<div className={cn('flex flex-col h-full', debug && 'px-0', className)}>
			<div className="flex justify-between items-center p-2">
				<FileConversationActions
					file={file}
					onToggleList={onToggleList}
					onToggleFileDetail={onToggleFileDetail}
					isFileListVisible={isFileListVisible}
					isFileDetailVisible={isFileDetailVisible}
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
								initialRenderDate={initialRenderDate}
								isAuthorCurrentUser={action.author === user._id}
								fileId={file._id}
							/>
						) : (
							<Action
								key={action._id}
								action={action}
								initialRenderDate={initialRenderDate}
								isAuthorCurrentUser={action.author === user._id}
								fileId={file._id}
							/>
						),
					)}
				</StickToBottomContent>
			</StickToBottom>

			<ActionComposer file={file} />

			<EnergyDrawer
				open={Boolean(isEnergyDrawerOpen)}
				onOpenChange={(open) =>
					navigate({
						to: '.',
						search: (prev: Record<string, unknown>) => ({
							...prev,
							isEnergyDrawerOpen: open || undefined,
						}),
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
			if (!scrollRef.current) return;

			const isNearTop = scrollRef.current.scrollTop < NEAR_TOP_THRESHOLD;

			// Workaround: force scrollTop to 1 if it's exactly 0.
			// When it is 0 and we get new events, the browser autoscroll to the new top.
			if (scrollRef.current.scrollTop === 0) scrollRef.current.scrollTop = 1;

			// Load more when near the top
			if (isNearTop && status === 'CanLoadMore') loadMore(PAGE_SIZE);
		};

		const scrollContainer = scrollRef.current;
		scrollContainer?.addEventListener('scroll', handleScroll);

		return () => scrollContainer?.removeEventListener('scroll', handleScroll);
		// Keep ref.current in this dependency list intentionally: the listener is bound to the current
		// scroll container, not the stable callback ref wrapper from useStickToBottomContext.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loadMore, status, scrollRef.current]);

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
