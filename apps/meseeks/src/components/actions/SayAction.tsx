import { useNavigate } from '@tanstack/react-router';
import { AlignJustify, Bug, Expand, Minimize2, TextQuote } from 'lucide-react';
import { useState } from 'react';
import type { MouseEvent, TouchEvent } from 'react';
import { cn } from '@reactor/ui/lib/utils';

import { ActionComponentProps } from '~/components/actions';
import { CopyButton } from '~/components/CopyButton';
import { Button } from '@reactor/ui/button';
import { Message, MessageContent } from '~/components/ui/message';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@reactor/ui/tooltip';
import { useFullscreenAction } from '@reactor/ui/hooks/useFullscreenAction';
import { useSay } from '~/hooks/useFileMutations';

export function SayAction(props: ActionComponentProps & { shouldRenderComponents?: boolean; contentKey?: string }) {
	//
	const {
		action,
		fileId,
		isAuthorCurrentUser,
		className,
		shouldRenderComponents = false,
		contentKey = 'message',
	} = props;
	const fullscreen = useFullscreenAction();

	const { say, isSaying } = useSay();
	const message = stringArg(action.args, contentKey) ?? '';

	const onClickFix = (e: MouseEvent, error: Error) => {
		e.stopPropagation();
		if (isSaying) return;
		say({
			fileId,
			message: `The ${action.skillKey} action above failed. Error details: ${error.message}. Please fix it.`,
		});
	};

	if (action.status === 'failed') return null;

	return (
		<>
			<Message
				isAuthorCurrentUser={isAuthorCurrentUser}
				className={cn(className, 'relative group')}
				onTouchEnd={fullscreen.handleOpenDoubleTap}
			>
				<MessageContent
					isMDX={true}
					shouldRenderComponents={shouldRenderComponents}
					onClickMDXFix={shouldRenderComponents ? onClickFix : undefined}
					text={message}
					className={cn({
						'bg-primary text-primary-foreground p-3': isAuthorCurrentUser,
						'px-0': !isAuthorCurrentUser,
					})}
				/>
				<div className="absolute top-1 right-1 flex gap-1" onTouchEnd={(event) => event.stopPropagation()}>
					<DebugButton
						action={action}
						className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
					/>
					<ExpandButton
						onClick={fullscreen.toggle}
						className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
					/>
					<CopyButton
						textToCopy={message}
						className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity"
					/>
				</div>
			</Message>
			{fullscreen.isFullscreen && (
				<FullscreenMessage
					message={message}
					onClose={fullscreen.close}
					onDoubleTap={fullscreen.handleCloseDoubleTap}
					action={action}
					shouldRenderComponents={shouldRenderComponents}
				/>
			)}
		</>
	);
}

function stringArg(args: Record<string, unknown>, key: string) {
	//
	const value = args[key];
	return typeof value === 'string' ? value : undefined;
}

function FullscreenMessage({
	message,
	onClose,
	onDoubleTap,
	action,
	shouldRenderComponents,
}: {
	message: string;
	onClose: () => void;
	onDoubleTap: (event: TouchEvent) => void;
	action: ActionComponentProps['action'];
	shouldRenderComponents: boolean;
}) {
	//
	const [isReaderMode, setIsReaderMode] = useState(true);

	return (
		<div
			className="fixed inset-0 z-50 overflow-auto overscroll-contain bg-background text-foreground"
			onTouchEnd={onDoubleTap}
		>
			{/* floating controls */}
			<div
				className="fixed top-4 right-4 flex gap-2 z-10"
				onDoubleClick={(event) => event.stopPropagation()}
				onTouchEnd={(event) => event.stopPropagation()}
			>
				<ReaderModeButton
					isReaderMode={isReaderMode}
					onClick={() => setIsReaderMode(!isReaderMode)}
					className="opacity-70 hover:opacity-100 transition-opacity"
				/>
				<CopyButton textToCopy={message} className="opacity-70 hover:opacity-100 transition-opacity" />
				<DebugButton action={action} className="opacity-70 hover:opacity-100 transition-opacity" />
				<MinimizeButton onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity" />
			</div>

			{/* content wrapper that controls width */}
			<div
				className={cn(
					'min-h-full p-4 mx-auto transition-[max-width] duration-300 ease-out',
					isReaderMode ? 'max-w-prose' : 'max-w-full',
				)}
			>
				<MessageContent
					isMDX={true}
					shouldRenderComponents={shouldRenderComponents}
					text={message}
					className="text-lg leading-relaxed rounded-none p-0 max-w-none md:max-w-none"
				/>
			</div>
		</div>
	);
}

function ExpandButton({ onClick, className }: { onClick: (e?: MouseEvent) => void; className?: string }) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon" onClick={onClick} className={cn('h-6 w-6 border', className)}>
						<Expand className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Expand to fullscreen</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function MinimizeButton({ onClick, className }: { onClick: () => void; className?: string }) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon" onClick={onClick} className={cn('h-6 w-6 border', className)}>
						<Minimize2 className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Exit fullscreen</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function DebugButton({ action, className }: { action: ActionComponentProps['action']; className?: string }) {
	//
	const navigate = useNavigate();

	const handleDebugClick = (e?: MouseEvent) => {
		e?.stopPropagation();

		// Navigate to dev mode with action anchor
		navigate({
			to: '/$',
			search: (prev) => ({ ...prev, debug: true }),
			hash: `action-${action._id}`,
		});
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="outline"
						size="icon"
						onClick={handleDebugClick}
						className={cn('h-6 w-6 border', className)}
					>
						<Bug className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">Inspect in dev mode</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function ReaderModeButton({
	isReaderMode,
	onClick,
	className,
}: {
	isReaderMode: boolean;
	onClick: () => void;
	className?: string;
}) {
	//
	const Icon = isReaderMode ? AlignJustify : TextQuote;
	const tooltip = isReaderMode ? 'Full width' : 'Reader mode';

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button variant="outline" size="icon" onClick={onClick} className={cn('h-6 w-6 border', className)}>
						<Icon className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs">{tooltip}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
